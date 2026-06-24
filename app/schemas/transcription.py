from pydantic import BaseModel, Field, field_validator
import re
from typing import List

class TranscriptionRequest(BaseModel):
    url: str = Field(
        ...,
        description="The YouTube video URL to transcribe",
        examples=["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
    )

    @field_validator("url")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        # YouTube URL regex matching standard watch, embed, share link formats
        youtube_regex = (
            r'^(https?://)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)/'
            r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
        )
        if not re.match(youtube_regex, v):
            raise ValueError("Invalid YouTube URL. Must be a valid youtube.com or youtu.be link.")
        return v

    model_config = {
        "extra": "forbid"
    }

class TranscriptionSegment(BaseModel):
    start: float = Field(..., ge=0, description="Start time of the segment in seconds")
    end: float = Field(..., ge=0, description="End time of the segment in seconds")
    text: str = Field(..., description="The text content of the segment")

class TranscriptionResponse(BaseModel):
    source: str = Field(..., description="The source of the transcription, e.g., 'youtube'")
    lang: str = Field(..., description="The language of the transcription, e.g., 'en', 'vi'")
    segments: List[TranscriptionSegment] = Field(..., description="List of timed transcription segments")

