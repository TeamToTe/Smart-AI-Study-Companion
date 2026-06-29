import logging
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.transcribe import router as transcribe_router
from app.api.chat import router as chat_router
from app.api.glossary import router as glossary_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="YouTube Transcription API",
    description="A production-ready API that extracts and parses transcripts/subtitles from YouTube URLs.",
    version="1.0.0",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers with prefix
app.include_router(transcribe_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(glossary_router, prefix="/api")

@app.get("/health", tags=["health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy"}

@app.get("/hello", tags=["health"])
def hello():
    return {"hello" : "world"}