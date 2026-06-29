from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.schemas.glossary import GlossaryTermResponse
from app.services.glossary import GlossaryService, get_glossary_service
from app.services.database import DatabaseService
from app.core.auth import get_current_user, security

router = APIRouter(tags=["glossary"])

@router.get(
    "/glossary/definition",
    response_model=GlossaryTermResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy hoặc tự động tạo định nghĩa cho thuật ngữ kỹ thuật",
    description="Tra cứu thuật ngữ trong bảng glossary_definitions của Supabase. Nếu chưa tồn tại, gọi Gemini AI dịch và định nghĩa, sau đó lưu kết quả vào database để tái sử dụng.",
)
async def get_term_definition(
    term: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    glossary_service: GlossaryService = Depends(get_glossary_service),
    db_service: DatabaseService = Depends(),
) -> GlossaryTermResponse:
    # Xác thực token người dùng trước
    get_current_user(credentials)
    token = credentials.credentials
    
    if not term or not term.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Term parameter cannot be empty."
        )
        
    return await glossary_service.get_or_create_definition(
        term=term,
        user_token=token,
        db_service=db_service
    )
