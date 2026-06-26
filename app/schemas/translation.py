from pydantic import BaseModel, Field
from typing import List

class TranslationSegment(BaseModel):
    start: float = Field(..., ge=0, description="Start time of the segment in seconds")
    end: float = Field(..., ge=0, description="End time of the segment in seconds")
    text: str = Field(..., description="The translated or corrected text content of the segment")
    original_text: str = Field("", description="The original English text content of the segment")
    domain_words: List[str] = Field(
        ...,
        description="List of domain words preserved or translated back to English in this segment"
    )

class TranslationResponse(BaseModel):
    lang: str = Field(..., description="The target language of the translation, e.g. 'vi'")
    segments: List[TranslationSegment] = Field(..., description="List of timed translated/processed segments")
