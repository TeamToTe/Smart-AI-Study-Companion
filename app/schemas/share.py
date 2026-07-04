from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
import re

class SegmentShare(BaseModel):
    start_time: float = Field(..., ge=0.0)
    end_time: float = Field(..., ge=0.0)
    original_text: str = Field(..., min_length=1)
    translated_text: str = Field(..., min_length=1)
    highlights: List[str] = Field(default_factory=list)
    sequence_number: int = Field(..., ge=0)

    model_config = {
        "extra": "forbid"
    }

class CreateShareRequest(BaseModel):
    video_url: str = Field(..., description="YouTube video URL")
    video_title: str = Field(..., min_length=1)
    video_duration_seconds: Optional[int] = Field(None, ge=0)
    license_type: str = Field(
        default="CC-BY-NC-SA",
        description="Creative Commons license type"
    )
    attribution_name: Optional[str] = Field(None, max_length=100)
    is_public: bool = True
    segments: List[SegmentShare]

    @field_validator("video_url")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        youtube_regex = (
            r'^(https?://)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)/'
            r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
        )
        if not re.match(youtube_regex, v):
            raise ValueError("Invalid YouTube URL. Must be a valid youtube.com or youtu.be link.")
        return v

    @field_validator("license_type")
    @classmethod
    def validate_license_type(cls, v: str) -> str:
        valid_licenses = {"CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"}
        if v not in valid_licenses:
            raise ValueError(f"Invalid license_type. Must be one of {valid_licenses}")
        return v

    model_config = {
        "extra": "forbid"
    }

class ShareMetadataResponse(BaseModel):
    id: str
    share_token: str
    cloned_from_id: Optional[str] = None
    video_url: str
    video_title: str
    license_type: str
    attribution_name: Optional[str] = None
    views_count: int
    clones_count: int
    avg_rating: float
    ratings_count: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class SharedTranscriptResponse(ShareMetadataResponse):
    segments: List[SegmentShare]

    model_config = {
        "from_attributes": True
    }

class SubmitRatingRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review_comment: Optional[str] = Field(None, max_length=500)

    model_config = {
        "extra": "forbid"
    }

class RatingResponse(BaseModel):
    id: str
    shared_transcript_id: str
    user_id: str
    rating: int
    review_comment: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
