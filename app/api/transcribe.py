from fastapi import APIRouter, Depends, status

from app.schemas.transcription import TranscriptionRequest, TranscriptionResponse
from app.services.transcription import TranscriptionService, get_transcription_service

router = APIRouter(tags=["transcriptions"])

@router.post(
    "/transcriptions",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get transcript from a YouTube URL",
    description="Extracts English or Vietnamese transcriptions/subtitles from a given YouTube video URL.",
)
async def get_youtube_transcript(
    payload: TranscriptionRequest,
    service: TranscriptionService = Depends(get_transcription_service),
) -> TranscriptionResponse:
    """
    Acquires subtitles/captions (manually uploaded or auto-generated)
    for a YouTube video in English or Vietnamese and parses them.
    """
    return await service.get_youtube_transcript(payload.url)
