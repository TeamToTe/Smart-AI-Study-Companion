# Smart AI Study Companion

A FastAPI application that extracts transcripts/subtitles from YouTube videos (using subtitles or Gemini Speech-to-Text fallback) and translates them into Vietnamese while preserving core technical domain terms in English.

## 1. Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   ```

## 2. Running the Server

Start the local development server:
```bash
uvicorn app.main:app --reload
```
Once running, you can access the interactive API documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## 3. Main Endpoints

- **`POST /api/transcriptions`**: Retrieves the transcript of a YouTube video. Attempts to download official subtitles first (via `yt-dlp`), falling back to Gemini Speech-to-Text if subtitles are unavailable.
- **`POST /api/transcriptions/gemini`**: Direct transcription from audio using Gemini Speech-to-Text.
- **`POST /api/transcriptions/translate`**: Translates segment lists to Vietnamese, keeping computer science and machine learning terms in English.
