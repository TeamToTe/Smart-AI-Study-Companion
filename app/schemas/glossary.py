from pydantic import BaseModel, Field
from typing import Optional

class GlossaryTermResponse(BaseModel):
    term: str = Field(..., description="Thuật ngữ bằng tiếng Anh")
    translation: str = Field(..., description="Bản dịch tiếng Việt")
    definition: str = Field(..., description="Định nghĩa ngắn gọn")
    category: Optional[str] = Field("General", description="Lĩnh vực chuyên ngành")
