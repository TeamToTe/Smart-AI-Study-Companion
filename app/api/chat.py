from fastapi import APIRouter, Depends, status, HTTPException
from typing import Optional
from fastapi.security import HTTPAuthorizationCredentials
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse, HistoryMessage
from app.services.chat import ChatService, get_chat_service
from app.services.database import DatabaseService
from app.core.auth import get_current_user, security

router = APIRouter(tags=["chat"])

@router.get(
    "/chat/history",
    response_model=ChatHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy lịch sử cuộc trò chuyện theo video bài giảng",
    description="Kiểm tra và trả về session_id cùng danh sách toàn bộ các cặp tin nhắn cũ của video bài giảng tương ứng.",
)
async def get_history(
    video_url: str,
    video_title: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db_service: DatabaseService = Depends(),
) -> ChatHistoryResponse:
    user_payload = get_current_user(credentials)
    user_id = user_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User ID not found in token."
        )
    
    token = credentials.credentials
    
    # Lấy hoặc tạo session cho video này
    session_id = await db_service.get_or_create_session(
        user_token=token,
        user_id=user_id,
        video_url=video_url,
        video_title=video_title
    )
    
    # Lấy danh sách lịch sử tin nhắn
    messages = await db_service.get_chat_history(user_token=token, session_id=session_id)
    
    # Định dạng tin nhắn cho response schema
    history_messages = [
        HistoryMessage(sender=m["sender"], text=m["text"], time=m.get("time"))
        for m in messages
    ]
    
    return ChatHistoryResponse(session_id=session_id, messages=history_messages)

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat với trợ lý AI về bài học video",
    description="Gửi câu hỏi và phụ đề để nhận câu trả lời trích dẫn nguồn từ Gemini AI, đồng thời lưu tin nhắn vào Supabase.",
)
async def chat_with_assistant(
    payload: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: ChatService = Depends(get_chat_service),
    db_service: DatabaseService = Depends(),
) -> ChatResponse:
    # Xác thực token người dùng trước
    get_current_user(credentials)
    
    token = credentials.credentials
    return await service.get_chat_response(payload, token, db_service)
