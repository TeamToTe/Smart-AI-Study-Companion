from fastapi import APIRouter, Depends, status

from app.schemas.transcription import TranscriptionRequest, TranscriptionResponse
from app.schemas.translation import TranslationResponse
from app.services.transcription import TranscriptionService, get_transcription_service
from app.services.gemini_transcript import GeminiTranscriptionService, get_gemini_transcription_service
from app.services.translate import TranslateService, get_translate_service

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

@router.post(
    "/transcriptions/gemini",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe YouTube URL using Gemini STT",
    description="Extracts audio from a given YouTube video URL and transcribes it using Gemini Speech-to-Text.",
)
async def get_gemini_transcript(
    payload: TranscriptionRequest,
    service: GeminiTranscriptionService = Depends(get_gemini_transcription_service),
) -> TranscriptionResponse:
    """
    Downloads audio for the YouTube video URL, uploads it to Gemini, and transcribes the audio.
    """
    return await service.transcribe_youtube(payload.url)

@router.post(
    "/transcriptions/translate",
    response_model=TranslationResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate transcription to Vietnamese with domain words preserved/restored",
    description="Translates the timed segments of a transcription response to Vietnamese, ensuring that tech terms stay in English.",
)
async def translate_transcript(
    payload: TranscriptionResponse,
    service: TranslateService = Depends(get_translate_service),
) -> TranslationResponse:
    """
    Translates the segments of a TranscriptionResponse to Vietnamese while preserving or
    restoring English domain/technical words.
    """
    return await service.translate_to_vietnamese(payload)


