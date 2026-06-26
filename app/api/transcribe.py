from fastapi import APIRouter, Depends, status
from celery import chain
from celery.result import AsyncResult

from app.core.celery_app import celery_app
from app.tasks.transcription_tasks import get_transcript_task, orchestrate_translation_task
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


@router.post(
    "/transcriptions/async",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asynchronously transcribe and translate YouTube video",
    description="Submits a YouTube video URL for background transcription and translation to Vietnamese.",
)
def start_async_transcription(payload: TranscriptionRequest):
    """
    Submits a YouTube URL. Returns a task ID to poll for status, checking for cached responses first.
    """
    import os
    import re
    
    # Extract video_id to check cache
    url = payload.url
    reg = r"^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*"
    match = re.match(reg, url)
    video_id = match.group(2) if match and len(match.group(2)) == 11 else None
    
    if video_id:
        cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
        cache_file = os.path.join(cache_dir, f"{video_id}.json")
        if os.path.exists(cache_file):
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Cache hit for video {video_id}. Returning cached task.")
            return {"task_id": f"cached_{video_id}", "status": "SUCCESS"}

    import uuid
    orchestrate_task_id = str(uuid.uuid4())
    get_transcript_task_id = str(uuid.uuid4())

    sig_get = get_transcript_task.s(payload.url, orchestrate_task_id)
    sig_get.set(task_id=get_transcript_task_id)

    sig_orch = orchestrate_translation_task.s()
    sig_orch.set(task_id=orchestrate_task_id)

    workflow = chain(sig_get, sig_orch)
    workflow.apply_async()
    return {"task_id": orchestrate_task_id, "status": "PENDING"}


@router.get(
    "/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Get status and results of a transcription task",
)
def get_task_status(task_id: str):
    """
    Checks the status of a Celery background task by ID.
    If the task ID corresponds to a cached video, serves the cache directly.
    """
    import os
    import json
    
    # Check if task is a cached hit
    if task_id.startswith("cached_"):
        video_id = task_id.replace("cached_", "")
        cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
        cache_file = os.path.join(cache_dir, f"{video_id}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                return {
                    "task_id": task_id,
                    "status": "SUCCESS",
                    "progress": 100,
                    "result": cached_data
                }
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error reading cache file {cache_file}: {e}")
                
        return {
            "task_id": task_id,
            "status": "FAILURE",
            "progress": 0,
            "result": {"error": "Cache file not found or corrupted"}
        }

    res = AsyncResult(task_id, app=celery_app)
    
    # Try to fetch progress from Redis
    progress_val = 0
    if res.state in ["SUCCESS", "FAILURE"]:
        progress_val = 100
    else:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            r = redis.Redis.from_url(redis_url)
            val = r.get(f"progress:{task_id}")
            if val is not None:
                progress_val = int(float(val))
        except Exception:
            pass # Gracefully degrade if Redis is down
            
    response_data = {
        "task_id": task_id,
        "status": res.state,
        "progress": progress_val,
        "result": None
    }
    
    if res.state == "SUCCESS":
        response_data["result"] = res.result
    elif res.state == "FAILURE":
        response_data["result"] = {"error": str(res.result)}
        
    return response_data



