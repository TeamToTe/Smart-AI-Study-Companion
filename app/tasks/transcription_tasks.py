import asyncio
import logging
import os
from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task
def get_transcript_task(youtube_url: str, orchestrate_task_id: str) -> dict:
    """
    Retrieves the YouTube transcript using TranscriptionService.
    Tries yt-dlp first, then falls back to Gemini STT.
    Returns serialized TranscriptionResponse dictionary.
    """
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        r = redis.Redis.from_url(redis_url)
        r.setex(f"progress:{orchestrate_task_id}", 86400, 10)
    except Exception:
        pass

    from app.services.transcription import TranscriptionService
    
    service = TranscriptionService()
    # Execute async service method synchronously inside the Celery worker thread
    response = asyncio.run(service.get_youtube_transcript(youtube_url))

    try:
        r = redis.Redis.from_url(redis_url)
        r.setex(f"progress:{orchestrate_task_id}", 86400, 30)
    except Exception:
        pass

    res_dict = response.model_dump()
    res_dict["youtube_url"] = youtube_url
    return res_dict


@celery_app.task(bind=True, max_retries=15)
def translate_batch_task(self, batch_segments: list, lang: str, orchestrate_task_id: str) -> list:
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

    from app.core.key_rotation import get_groq_api_key
    api_key = get_groq_api_key()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in the environment (neither GROQ_API_KEY nor GROQ_API_KEYS)")

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

        # Update progress in Redis
        try:
            import redis
            r = redis.Redis.from_url(redis_url)
            completed = r.incr(f"progress:{orchestrate_task_id}:completed")
            total_val = r.get(f"progress:{orchestrate_task_id}:total")
            if total_val:
                total = int(total_val)
                progress_percentage = min(95, int(35 + 60 * (completed / total)))
                r.setex(f"progress:{orchestrate_task_id}", 86400, progress_percentage)
        except Exception:
            pass

        translated_list = res.get("segments", [])
        model_name = res.get("model", "")
        for i, seg in enumerate(translated_list):
            if i < len(batch_segments):
                seg["original_text"] = batch_segments[i]["text"]
            seg["model"] = model_name
        return translated_list
    except Exception as e:
        logger.warning(f"Failed to translate batch, retrying: {e}")
        raise self.retry(exc=e, countdown=10)


@celery_app.task(bind=True)
def merge_translation_task(self, results: list, youtube_url: str = "", orchestrate_task_id: str = None) -> dict:
    """
    Combines the results from parallel translated segment batches back into a 
    single unified TranslationResponse-like dict structure and caches it.
    """
    translated_segments = []
    for batch_segments in results:
        # Each batch_segments is a list of segment dicts
        translated_segments.extend(batch_segments)
        
    merged_result = {
        "lang": "vi",
        "segments": translated_segments,
        "youtube_url": youtube_url,
        "video_url": youtube_url
    }

    # Save translated script to app/storage
    task_id = orchestrate_task_id or self.request.id
    if task_id:
        import json
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
        try:
            os.makedirs(storage_dir, exist_ok=True)
            storage_file = os.path.join(storage_dir, f"{task_id}.json")
            with open(storage_file, "w", encoding="utf-8") as f:
                json.dump(merged_result, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved translated script to storage: {storage_file}")
        except Exception as e:
            logger.error(f"Failed to write translated script to storage: {e}")

    # Cache translation result to file
    # if youtube_url:
    #     import json
    #     import re
    #     reg = r"^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*"
    #     match = re.match(reg, youtube_url)
    #     video_id = match.group(2) if match and len(match.group(2)) == 11 else None
        
    #     if video_id:
    #         cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
    #         os.makedirs(cache_dir, exist_ok=True)
    #         cache_file = os.path.join(cache_dir, f"{video_id}.json")
    #         try:
    #             with open(cache_file, "w", encoding="utf-8") as f:
    #                 json.dump(merged_result, f, ensure_ascii=False, indent=2)
    #             logger.info(f"Saved translation results to cache file: {cache_file}")
    #         except Exception as e:
    #             logger.error(f"Failed to write cache file: {e}")

    return merged_result


@celery_app.task(bind=True)
def orchestrate_translation_task(self, transcription: dict):
    """
    Orchestrator task that takes the transcription, batches segments,
    and replaces itself with a Celery chord (group | callback) to translate in parallel.
    """
    from celery import group
    
    segments = transcription.get("segments", [])
    lang = transcription.get("lang", "en")
    youtube_url = transcription.get("youtube_url", "")
    
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

    # Initialize total and completed batches count in Redis
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        r = redis.Redis.from_url(redis_url)
        r.setex(f"progress:{self.request.id}", 86400, 35)
        r.setex(f"progress:{self.request.id}:total", 86400, len(batches))
        r.setex(f"progress:{self.request.id}:completed", 86400, 0)
    except Exception:
        pass
    
    # Create parallel translation tasks and link to merge_translation_task callback
    header = group(translate_batch_task.s(batch, lang, self.request.id) for batch in batches)
    callback = merge_translation_task.s(youtube_url=youtube_url, orchestrate_task_id=self.request.id)
    
    # Safely replace the task execution with the chord workflow to avoid deadlock and result.get() error
    return self.replace(header | callback)

