import asyncio
import logging
import os
import tempfile
import yt_dlp

from dotenv import load_dotenv
from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from google import genai
from google.genai import types
from app.schemas.transcription import TranscriptionResponse, TranscriptionSegment

load_dotenv()
logger = logging.getLogger(__name__)

def _download_audio(url: str) -> str:
    """
    Downloads the audio from the YouTube video URL and returns the path to the temporary audio file.
    Runs synchronously and should be executed in a thread pool.
    """
    temp_dir = tempfile.gettempdir()
    output_path_template = os.path.join(temp_dir, "%(id)s.%(ext)s")
    
    ydl_opts = {
        'format': 'm4a/bestaudio/best',
        'outtmpl': output_path_template,
        'quiet': True,
        'no_warnings': True,
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        
        if os.path.exists(filename):
            return filename
            
        # Fallback in case container fixing or post-processing changed the extension
        video_id = info.get('id')
        if video_id:
            for f in os.listdir(temp_dir):
                if f.startswith(video_id) and f != video_id:
                    path = os.path.join(temp_dir, f)
                    if os.path.isfile(path):
                        return path
                        
        raise FileNotFoundError(f"Could not locate downloaded audio file for YouTube URL: {url}")


async def _generate_content_single_call(
    aclient,
    model: str,
    contents: list,
    config: types.GenerateContentConfig
):
    """
    Calls generate_content exactly once.
    """
    logger.info(f"Transcribing audio using model {model}...")
    return await aclient.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )


class GeminiTranscriptionService:
    async def transcribe_youtube(self, url: str) -> TranscriptionResponse:
        """
        Transcribes a YouTube video by downloading its audio and sending it to Gemini Speech-to-Text.
        Uses the official google-genai SDK, featuring retries and fallback to Gemini 2.5 Flash Lite.
        """
        from app.core.key_rotation import get_gemini_api_key
        api_key = get_gemini_api_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API Key is not configured on the server. Please set GEMINI_API_KEY or GEMINI_API_KEYS in the environment."
            )
            
        local_file_path = None
        uploaded_file = None
        client = genai.Client(api_key=api_key)
        
        try:
            # Step 1: Download audio format from YouTube (runs blocking call in thread pool)
            try:
                local_file_path = await run_in_threadpool(_download_audio, url)
            except yt_dlp.utils.DownloadError as e:
                logger.error(f"yt-dlp failed to download URL {url}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to access or download YouTube video: {str(e)}"
                )
            except Exception as e:
                logger.error(f"Unexpected error downloading YouTube audio for {url}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"An unexpected error occurred during audio extraction: {str(e)}"
                )
                
            # Step 2: Upload and transcribe audio using Google GenAI SDK
            # Upload the local audio file to the Gemini Files API
            # Determine mime type based on file extension
            import mimetypes
            mimetypes.init()
            ext = os.path.splitext(local_file_path)[1].lower()
            ext_to_mime = {
                '.m4a': 'audio/mp4',
                '.mp4': 'audio/mp4',
                '.mp3': 'audio/mp3',
                '.ogg': 'audio/ogg',
                '.wav': 'audio/wav',
                '.webm': 'audio/webm',
                '.opus': 'audio/opus',
                '.flac': 'audio/x-flac',
                '.aac': 'audio/aac'
            }
            mime_type = ext_to_mime.get(ext)
            if not mime_type:
                mime_type, _ = mimetypes.guess_type(local_file_path)
            if not mime_type:
                mime_type = 'audio/mp4' # Safe default for audio formats
                
            try:
                uploaded_file = await client.aio.files.upload(
                    file=local_file_path,
                    config=types.UploadFileConfig(mime_type=mime_type)
                )
                logger.info(f"Successfully uploaded audio file to Gemini Files API: {uploaded_file.name} with mime type {mime_type}")
            except Exception as e:
                logger.error(f"Failed to upload audio file to Gemini Files API: {e}")
                raise HTTPException(
                    status_code=500,  # Map to gateway upload failure
                    detail=f"Failed to upload audio file to Gemini API: {str(e)}"
                )

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TranscriptionResponse,
                temperature=0.0,  # Zero temperature for deterministic/accurate transcription
            )
            
            contents = [
                uploaded_file,
                "Please transcribe the entire audio file verbatim. For each spoken phrase, provide the exact start and end timestamps in seconds (as floats, e.g. 12.34). Keep segments short (around 5 to 10 seconds each). Ensure the timestamps match the actual audio timeline precisely and do not drift or accumulate errors as time progresses."
            ]
            
            # Run the primary-then-fallback pipeline up to 3 times total
            delays = [5.0, 10.0]
            max_tries = 3
            response = None
            last_exception = None
            models = [
                "gemini-3.5-flash",
                "gemini-3.1-flash-lite",
                "gemini-3-flash",
                "gemini-2.5-flash-lite",
                "gemini-2.5-flash"
            ]
            
            for attempt in range(max_tries):
                success = False
                for idx, model_name in enumerate(models):
                    try:
                        if idx > 0:
                            logger.warning(
                                f"Pipeline attempt {attempt + 1}: Model {models[idx-1]} failed. "
                                f"Falling back immediately to {model_name}..."
                            )
                        logger.info(f"Pipeline attempt {attempt + 1} of {max_tries}: Trying model {model_name}...")
                        response = await _generate_content_single_call(
                            aclient=client.aio,
                            model=model_name,
                            contents=contents,
                            config=config
                        )
                        success = True
                        break  # Success on this model!
                    except Exception as err:
                        last_exception = err
                        logger.warning(
                            f"Pipeline attempt {attempt + 1}: Model {model_name} failed: {err}"
                        )
                
                if success:
                    break

                if attempt < max_tries - 1:
                    delay = delays[attempt]
                    logger.info(f"Waiting {delay} seconds before retrying the transcription pipeline...")
                    await asyncio.sleep(delay)
            
            if response is None:
                logger.error(f"All transcription models failed after all pipeline attempts. Last error: {last_exception}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=(
                        f"Gemini transcription failed for all models: {', '.join(models)}. "
                        f"Last error: {str(last_exception)}"
                    )
                )

            # Parse the response into TranscriptionResponse Pydantic model
            if response.parsed:
                return response.parsed
            
            # Fallback if parsing failed or .parsed is not populated
            if response.text:
                try:
                    return TranscriptionResponse.model_validate_json(response.text)
                except Exception as parse_err:
                    logger.error(f"Failed to validate JSON response text from Gemini: {parse_err}. Content: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Gemini API returned content that did not match the expected transcription schema."
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini API returned an empty response."
                )
            
        finally:
            # Clean up the local temporary audio file
            if local_file_path and os.path.exists(local_file_path):
                try:
                    os.remove(local_file_path)
                    logger.info(f"Cleaned up local audio file: {local_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to remove local temporary file {local_file_path}: {e}")
            
            # Clean up the uploaded Gemini file to free up user space
            if uploaded_file:
                try:
                    await client.aio.files.delete(name=uploaded_file.name)
                    logger.info(f"Successfully cleaned up Gemini file: {uploaded_file.name}")
                except Exception as e:
                    logger.warning(f"Failed to delete temporary Gemini file {uploaded_file.name}: {e}")
            
            # Ensure the GenAI client session is closed
            try:
                await client.aio.aclose()
            except Exception as e:
                logger.warning(f"Failed to close Gemini API client connection: {e}")



def get_gemini_transcription_service() -> GeminiTranscriptionService:
    """Dependency injection provider for GeminiTranscriptionService."""
    return GeminiTranscriptionService()
