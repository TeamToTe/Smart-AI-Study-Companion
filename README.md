# Smart AI Study Companion

An AI-powered service that extracts transcripts from YouTube videos and translates them into Vietnamese while preserving standard English technical terms (ML, CS, Data Science).

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire stack (FastAPI, Redis, and Celery):

1. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   
   # Supabase Setup (Dashboard -> Project Settings)
   SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   ANON_KEY="your-supabase-anon-key"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_JWT="your-supabase-jwt-secret"
   ```

2. **Start Services**:
   ```bash
   docker compose up --build
   ```

3. **Explore**:
   Open [http://localhost:8000/docs](http://localhost:8000/docs) to view and test the API endpoints.

---

## 🛠️ Local Setup using NPM Scripts

If you want to run the project locally on your host machine, we provide convenient root NPM scripts to automate installation and startup:

1. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   
   # Supabase Setup (Dashboard -> Project Settings -> API)
   SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   ANON_KEY="your-supabase-anon-key"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_JWT="your-supabase-jwt-secret"
   ```

2. **Automated Setup**:
   Run this once to install root tools, frontend packages, and python requirements in `.venv`:
   ```bash
   npm run setup
   ```

3. **Run Services**:
   * **Frontend & Backend API only** (Lightweight development, Celery/Redis not required):
     ```bash
     npm run dev
     ```
   * **Full Stack with Celery background worker** (requires Redis to be running, e.g. via `docker compose up redis -d`):
     ```bash
     npm run fullstack
     ```

---

## 📡 Key Endpoints

- **`POST /api/transcriptions`**: Fetch YouTube transcript. Tries subtitles first, falls back to Gemini STT.
- **`POST /api/transcriptions/translate`**: Translate segment list to Vietnamese (technical terms preserved in English).
- **`POST /api/transcriptions/async`**: Enqueue asynchronous background transcript & translation workflow (returns `task_id`).
- **`GET /api/tasks/{task_id}`**: Get status and results of a background task.
