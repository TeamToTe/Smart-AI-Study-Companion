import logging
from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
import yt_dlp

from app.api.get_transcribe import get_transcript
from app.schemas.transcription import TranscriptionResponse, TranscriptionSegment

logger = logging.getLogger(__name__)

class TranscriptionService:
    async def get_youtube_transcript(self, url: str) -> TranscriptionResponse:
        """
        Retrieves the transcript for a given YouTube URL and processes it.
        Runs the synchronous yt-dlp logic in a thread pool.
        """
        try:
            result = await run_in_threadpool(get_transcript, url)
        except yt_dlp.utils.DownloadError as e:
            logger.error(f"yt-dlp DownloadError for URL {url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch YouTube video details or access the link: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error getting transcript for URL {url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred during transcription: {str(e)}"
            )

        if not result or result.get("source") is None or not result.get("segments"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No English or Vietnamese transcript found for this video."
            )

        # Build response model
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

def get_transcription_service() -> TranscriptionService:
    """Dependency injection provider for TranscriptionService."""
    return TranscriptionService()
