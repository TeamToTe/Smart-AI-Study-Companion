# Smart AI Study Companion

An AI-powered service that extracts transcripts from YouTube videos and translates them into Vietnamese while preserving standard English technical terms (ML, CS, Data Science).

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire stack (FastAPI, Redis, and Celery):

1. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   ```

2. **Start Services**:
   ```bash
   docker compose up --build
   ```

3. **Explore**:
   Open [http://localhost:8000/docs](http://localhost:8000/docs) to view and test the API endpoints.

---

## 🛠️ Alternative Local Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start FastAPI**:
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Start Celery Worker**:
   ```bash
   celery -A app.core.celery_app worker --loglevel=info
   ```

---

## 📡 Key Endpoints

- **`POST /api/transcriptions`**: Fetch YouTube transcript. Tries subtitles first, falls back to Gemini STT.
- **`POST /api/transcriptions/translate`**: Translate segment list to Vietnamese (technical terms preserved in English).
- **`POST /api/transcriptions/async`**: Enqueue asynchronous background transcript & translation workflow (returns `task_id`).
- **`GET /api/tasks/{task_id}`**: Get status and results of a background task.
