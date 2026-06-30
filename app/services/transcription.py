import logging
import yt_dlp
from typing import Optional

from fastapi import HTTPException, status, Depends
from fastapi.concurrency import run_in_threadpool
from app.schemas.transcription import TranscriptionResponse, TranscriptionSegment
from app.services.gemini_transcript import GeminiTranscriptionService, get_gemini_transcription_service

logger = logging.getLogger(__name__)

def _verify_video_duration(url: str) -> Optional[float]:
    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info.get("duration")

async def validate_video_duration(url: str) -> None:
    try:
        duration = await run_in_threadpool(_verify_video_duration, url)
        if duration and duration > 3600:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời lượng video vượt quá 1 giờ. Trợ lý học tập chỉ hỗ trợ các video có độ dài tối đa là 1 giờ."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to check video duration for {url}: {e}. Proceeding anyway...")
        pass

def _get_transcript(url: str) -> dict:
    """
    Return:
        { "source": "youtube", "lang": "en"|"vi", "segments": [...] }
        { "source": None, "segments": [] }
    """
    ydl_opts = {
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en.*", "vi.*"],
        "skip_download": True,
        "quiet": True,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    # Thử manual subtitle trước, rồi mới auto-generated
    for sub_type in ["subtitles", "automatic_captions"]:
        subs = info.get(sub_type, {})
        matched_keys = []
        for k in subs.keys():
            lang_prefix = k.lower().split('-')[0]
            if lang_prefix == "vi":
                matched_keys.insert(0, k)
            elif lang_prefix == "en":
                matched_keys.append(k)

        for lang_key in matched_keys:
            # Lấy format json3
            formats = subs[lang_key]
            json3 = next((f for f in formats if f.get("ext") == "json3"), None)
            if not json3:
                continue
            segments = _parse_json3_url(json3["url"])
            if segments:
                norm_lang = "vi" if lang_key.lower().startswith("vi") else "en"
                return {"source": "youtube", "lang": norm_lang, "segments": segments}

    return {"source": None, "segments": []}


def _parse_json3_url(url: str) -> list[dict]:
    import httpx
    r = httpx.get(url)
    if r.status_code != 200:
        return []
    data = r.json()
    result = []
    for event in data.get("events", []):
        text = "".join(s.get("utf8", "") for s in event.get("segs", []))
        if not text.strip():
            continue
        result.append({
            "start": event["tStartMs"] / 1000,
            "end": (event["tStartMs"] + event["dDurationMs"]) / 1000,
            "text": text.strip()
        })
    return result

class TranscriptionService:
    def __init__(self, gemini_service: GeminiTranscriptionService = None):
        self.gemini_service = gemini_service or GeminiTranscriptionService()

    async def get_youtube_transcript(self, url: str) -> TranscriptionResponse:
        """
        Retrieves the transcript for a given YouTube URL and processes it.
        Runs the synchronous yt-dlp logic in a thread pool.
        Falls back to Gemini transcription if yt-dlp fails to retrieve subtitles.
        """
        yt_failed = False
        result = None
        
        try:
            result = await run_in_threadpool(_get_transcript, url)
        except Exception as e:
            logger.warning(f"yt-dlp failed to get transcript for {url} with exception: {e}. Falling back to Gemini...")
            yt_failed = True
            
        if yt_failed or not result or result.get("source") is None or not result.get("segments"):
            logger.info(f"Subtitles not found via yt-dlp for {url}. Invoking Gemini Speech-to-Text fallback...")
            return await self.gemini_service.transcribe_youtube(url)

        # Build response model from yt-dlp result
        segments = [
            TranscriptionSegment(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"]
            )
            for seg in result["segments"]
        ]

        return TranscriptionResponse(
            source=result["source"],
            lang=result["lang"],
            segments=segments
        )

def get_transcription_service(
    gemini_service: GeminiTranscriptionService = Depends(get_gemini_transcription_service)
) -> TranscriptionService:
    """Dependency injection provider for TranscriptionService."""
    return TranscriptionService(gemini_service=gemini_service)
