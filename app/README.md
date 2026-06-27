# Smart AI Study Companion - Backend

This directory contains the FastAPI web application, Celery background tasks, and distributed rate-limiting logic.

## 📁 Directory Structure

```text
app/
├── api/          # FastAPI routers and route handlers (endpoints)
├── core/         # Celery app setup, Redis token-bucket rate limiter
├── schemas/      # Pydantic models for request & response validation
├── services/     # Core services (TranscriptionService, TranslateService)
└── tasks/        # Celery background tasks and pipeline orchestration
```

## ⚙️ Core Architecture

### 1. Task Pipeline Flow
When a user requests an asynchronous transcription via `POST /api/transcriptions/async`:
1. **Trigger**: FastAPI enqueues a Celery task chain and returns a `task_id` with `202 Accepted`.
2. **Transcription (`get_transcript_task`)**: Tries to download YouTube subtitles via `yt-dlp` first. Falls back to Gemini STT only if subtitles are missing.
3. **Orchestration (`orchestrate_translation_task`)**: Batches the segments into groups of 10 and schedules parallel translation tasks.
4. **Translation (`translate_batch_task`)**: Translates segment batches using Groq's API.
5. **Merging (`merge_translation_task`)**: Recombines batches into a single translation payload.

### 2. Distributed Rate Limiting
To prevent hitting API rate limits:
- A Redis-backed token bucket rate limiter (`app/core/rate_limiter.py`) is shared globally.
- Both Celery workers and FastAPI synchronous endpoints check this limiter before hitting Groq.
- If limits are reached, background tasks retry with backoff, and synchronous requests pause and retry.

