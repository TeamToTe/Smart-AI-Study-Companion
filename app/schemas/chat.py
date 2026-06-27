from pydantic import BaseModel, Field
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str = Field(..., description="Vai trò của người gửi: 'user' hoặc 'model'")
    content: str = Field(..., description="Nội dung tin nhắn")

class ChatSegment(BaseModel):
    start: float = Field(..., ge=0, description="Mốc bắt đầu tính bằng giây")
    end: float = Field(..., ge=0, description="Mốc kết thúc tính bằng giây")
    text: str = Field(..., description="Nội dung văn bản phụ đề")

class ChatRequest(BaseModel):
    query: str = Field(..., description="Câu hỏi hiện tại của người học")
    history: List[ChatMessage] = Field(default=[], description="Lịch sử hội thoại")
    segments: List[ChatSegment] = Field(..., description="Danh sách các đoạn phụ đề của bài giảng")
    
    model_config = {
        "extra": "forbid"
    }

class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi của trợ lý AI bằng định dạng Markdown")
