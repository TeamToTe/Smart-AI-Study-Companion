from fastapi import FastAPI
from app.api.transcribe import router as transcribe_router

app = FastAPI(
    title="YouTube Transcription API",
    description="A production-ready API that extracts and parses transcripts/subtitles from YouTube URLs.",
    version="1.0.0",
)

# Include the transcription router with prefix
app.include_router(transcribe_router, prefix="/api")

@app.get("/health", tags=["health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy"}
