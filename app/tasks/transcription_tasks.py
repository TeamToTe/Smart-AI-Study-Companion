import asyncio
import logging
import os
from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task
def get_transcript_task(youtube_url: str) -> dict:
    """
    Retrieves the YouTube transcript using TranscriptionService.
    Tries yt-dlp first, then falls back to Gemini STT.
    Returns serialized TranscriptionResponse dictionary.
    """
    from app.services.transcription import TranscriptionService
    
    service = TranscriptionService()
    # Execute async service method synchronously inside the Celery worker thread
    response = asyncio.run(service.get_youtube_transcript(youtube_url))
    return response.model_dump()


@celery_app.task(bind=True, max_retries=15)
def translate_batch_task(self, batch_segments: list, lang: str) -> list:
    """
    Translates a batch of transcription segments.
    Checks and acquires rate-limit tokens from Redis before invoking Groq.
    Retries task if rate-limited.
    """
    from app.core.rate_limiter import RedisTokenBucketRateLimiter
    from app.services.translate import _translate_batch_with_fallback, AsyncGroq

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Configure Groq Rate Limiter (e.g. capacity of 30 requests, refills 0.5 tokens/sec)
    rate_limiter = RedisTokenBucketRateLimiter(
        redis_url=redis_url,
        capacity=30,
        fill_rate=0.5
    )
    
    # Attempt to acquire 1 token for a Groq API request
    if not rate_limiter.acquire("groq", tokens_requested=1):
        logger.info("Groq API rate limit reached in Redis. Retrying translation task in 5 seconds...")
        raise self.retry(countdown=5)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in the environment")

    async def run_translation():
        client = AsyncGroq(api_key=api_key)
        semaphore = asyncio.Semaphore(2)
        try:
            res_dict = await _translate_batch_with_fallback(
                client=client,
                batch_segments=batch_segments,
                lang=lang,
                semaphore=semaphore
            )
            return res_dict
        finally:
            await client.close()

    try:
        res = asyncio.run(run_translation())
        return res.get("segments", [])
    except Exception as e:
        logger.warning(f"Failed to translate batch, retrying: {e}")
        raise self.retry(exc=e, countdown=10)


@celery_app.task
def merge_translation_task(results: list) -> dict:
    """
    Combines the results from parallel translated segment batches back into a 
    single unified TranslationResponse-like dict structure.
    """
    translated_segments = []
    for batch_segments in results:
        # Each batch_segments is a list of segment dicts
        translated_segments.extend(batch_segments)
        
    return {
        "lang": "vi",
        "segments": translated_segments
    }


@celery_app.task(bind=True)
def orchestrate_translation_task(self, transcription: dict):
    """
    Orchestrator task that takes the transcription, batches segments,
    and replaces itself with a Celery chord (group | callback) to translate in parallel.
    """
    from celery import group
    
    segments = transcription.get("segments", [])
    lang = transcription.get("lang", "en")
    
    if not segments:
        return {
            "lang": "vi",
            "segments": []
        }
        
    batch_size = 20
    batches = [
        segments[i:i + batch_size]
        for i in range(0, len(segments), batch_size)
    ]
    
    # Create parallel translation tasks and link to merge_translation_task callback
    header = group(translate_batch_task.s(batch, lang) for batch in batches)
    callback = merge_translation_task.s()
    
    # Safely replace the task execution with the chord workflow to avoid deadlock and result.get() error
    return self.replace(header | callback)

