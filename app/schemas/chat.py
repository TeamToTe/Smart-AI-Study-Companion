from pydantic import BaseModel, Field
from typing import List, Optional

class ChatSegment(BaseModel):
    start: float = Field(..., ge=0, description="Mốc bắt đầu tính bằng giây")
    end: float = Field(..., ge=0, description="Mốc kết thúc tính bằng giây")
    text: str = Field(..., description="Nội dung văn bản phụ đề")

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="ID phiên chat trong cơ sở dữ liệu")
    query: str = Field(..., max_length=2000, description="Câu hỏi hiện tại của người học")
    segments: List[ChatSegment] = Field(..., description="Danh sách các đoạn phụ đề của bài giảng")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Phản hồi của trợ lý AI bằng định dạng Markdown")

class HistoryMessage(BaseModel):
    sender: str = Field(..., description="Vai trò: 'user' hoặc 'bot'")
    text: str = Field(..., description="Nội dung tin nhắn")
    time: Optional[str] = Field(None, description="Thời gian tạo")

class ChatHistoryResponse(BaseModel):
    session_id: str = Field(..., description="ID phiên chat")
    messages: List[HistoryMessage] = Field(..., description="Lịch sử các tin nhắn")

class RawChatRequest(BaseModel):
    query: str = Field(..., max_length=2000, description="Câu hỏi hoặc prompt gửi tới Gemini")
    segments: List[ChatSegment] = Field(..., description="Danh sách các đoạn phụ đề của bài giảng")

