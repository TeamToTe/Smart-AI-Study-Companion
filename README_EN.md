# StudyMind: Smart AI Study Companion

[🌐 Bản Tiếng Việt](README.md)

StudyMind (Smart AI Study Companion) is an AI-powered educational application designed to enhance video-based learning. It automatically extracts transcripts from YouTube videos, translates them into Vietnamese while preserving standard English technical terms (Machine Learning, Computer Science, Data Science), and integrates helpful study tools such as an AI Mindmap, Study Flashcards, Interactive Quizzes, and a RAG Chatbot.

---

## TABLE OF CONTENTS
1. [🌟 Core Features](#-core-features)
2. [⚙️ System Architecture](#-system-architecture)
3. [🚀 Quick Start with Docker](#-quick-start-with-docker)
4. [🛠️ Manual Local Installation](#-manual-local-installation)
5. [🗄️ Supabase Database Schema](#-supabase-database-schema)
6. [📡 Key API Endpoints](#-key-api-endpoints)

---

## 🌟 CORE FEATURES

### 1. Interactive Video Workspace
* **Smart Subtitles:** Renders English-Vietnamese bilingual captions or single-line Vietnamese translations with English technical highlights. Captions are synchronized with video playback (includes a 400ms lag-offset compensation).
* **Automatic Hover Pause:** Hovering over highlighted technical terms instantly pauses the YouTube player and opens a card displaying the term's translation and technical definition.
* **State Persistence:** User preferences for Subtitles Lock (CC overlay visibility) and Auto-Scroll Lock are persisted to `localStorage` and maintained across page reloads.
* **Duration Warning:** Features a limit hint warning users that processing is restricted to videos under 1 hour to maintain performance.

### 2. AI Mindmap
* **Dynamic Generation:** Builds an interactive hierarchical mindmap of the lecture in Vietnamese using Gemini AI.
* **Mobile-Optimized Interface:** Automatically scales down to `55%` zoom on mobile layouts. Fully supports touch panning gestures on mobile screens and dragging on desktop.
* **Interactive Navigation:** Clicking any node in the mindmap automatically jumps the YouTube player to the exact timestamp of that subtopic.

### 3. Quiz & Flashcard Kits
* **Automated Extraction:** Generates double-sided study flashcards and multi-choice quizzes based on the processed video concepts.
* **Integrated Feedback Call-To-Action:** Shows quiz scores, detailed evaluation answers, and prompts a Google Form feedback survey link on results screens.

### 4. Retrieval-Augmented Generation (RAG) Chatbot
* **Context-Aware Study Assistant:** Allows users to query the tutor directly based on the context of the processed transcript segments.

### 5. Fully Responsive UI
* **Hamburger Menu Drawer:** Collapses site controls (theme, language, authentication, profile) into a clean glassmorphism sliding overlay on mobile viewports.
* **50-50 Column Selectors:** Top-level selectors split columns evenly (50-50 width) and display as rounded rectangles (`border-radius: 12px`) on mobile devices.
* **Dynamic Favicon:** Canvas-based dynamic favicon inverts its color palette automatically to match light/dark operating system themes.

---

## ⚙️ SYSTEM ARCHITECTURE

### 1. Asynchronous Celery Tasks Pipeline
When a YouTube link is submitted:
1. **FastAPI Entry:** Accepts the submission and enqueues a Celery task chain, returning a `task_id` with `202 Accepted`.
2. **Transcription Task:** Fetches available subtitles using `yt-dlp`. Falls back to downloading audio and using Gemini Speech-to-Text only if subtitles are missing.
3. **Parallel Translation:** Batches the segments (10 items per batch) and fires parallel translation tasks using Groq's Llama 3 API.
4. **Merge and Highlight:** Integrates translation batches back into a single payload and runs glossary keywords matching.

### 2. Distributed Rate Limiting
* Uses a shared Redis-backed token bucket rate limiter (`app/core/rate_limiter.py`).
* Ensures background workers and web controllers stay safely within Groq and Gemini API rate limits.

### 3. Supabase Auth & JWT Verification
* The backend authenticates requests by verifying the ES256 digital signature of the client JWT token using Base64 decode, securing the APIs.

---

## 🚀 QUICK START WITH DOCKER

### 1. Environment Variables Configuration (.env)
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
ANON_KEY="your-supabase-anon-key"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT="your-supabase-jwt-secret"
```

### 2. Startup Services

* **Development Stack:**
  ```bash
  docker compose up --build
  ```
* **Production Stack (Enforces video limits & DB checks):**
  ```bash
  docker compose -f docker-compose.prod.yml up --build -d
  ```

* **Frontend URL:** [http://localhost:5173](http://localhost:5173)
* **Backend Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ MANUAL LOCAL INSTALLATION

### 1. Prerequisites
* Node.js v18+.
* Python v3.10+.
* Running Redis server on default port `6379`.

### 2. Automated Installation Script
Run the automated installation script to install NPM packages and Python venv libraries:
```bash
npm run setup
```

### 3. Running Services
* **Vite Dev Server & FastAPI server only (no background worker):**
  ```bash
  npm run dev
  ```
* **Full Stack (requires Redis service for Celery tasks):**
  ```bash
  npm run fullstack
  ```

---

## 🗄️ SUPABASE DATABASE SCHEMA

Run the database setup script in the **SQL Editor** of your Supabase Dashboard:

```sql
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_video ON public.chat_sessions(user_id, video_url);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

CREATE TABLE IF NOT EXISTS public.glossary_definitions (
    term TEXT PRIMARY KEY,
    translation TEXT NOT NULL,
    definition TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage messages in their own sessions" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow anyone to read glossary definitions" ON public.glossary_definitions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert glossary definitions" ON public.glossary_definitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

## 📡 KEY API ENDPOINTS

* **`POST /api/transcriptions`**: Fetches YouTube transcript (Subtitles or Gemini audio-to-text).
* **`POST /api/transcriptions/translate`**: Translates segment array to Vietnamese, keeping technical keywords in English.
* **`POST /api/transcriptions/async`**: Enqueues asynchronous Celery pipeline execution (returns `task_id`).
* **`GET /api/tasks/{task_id}`**: Retrieves state and results of a background task.
* **`POST /api/chat/raw`**: RAG querying using sent transcript segments context.
* **`GET /api/glossary`**: Retrieves all technical term definitions in the glossary.
