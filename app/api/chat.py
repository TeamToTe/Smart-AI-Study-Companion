from fastapi import APIRouter, Depends, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService, get_chat_service

router = APIRouter(tags=["chat"])

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat với trợ lý AI về bài học video",
    description="Gửi câu hỏi, lịch sử trò chuyện và phụ đề của video để nhận câu trả lời trích dẫn nguồn từ Gemini AI.",
)
async def chat_with_assistant(
    payload: ChatRequest,
    service: ChatService = Depends(get_chat_service),
) -> ChatResponse:
    """
    Endpoint xử lý hội thoại RAG trực tiếp với video.
    Nhận câu hỏi, lịch sử và phụ đề để trả về phản hồi Markdown kèm timestamp.
    """
    return await service.get_chat_response(payload)
