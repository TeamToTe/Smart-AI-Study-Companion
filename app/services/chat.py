import logging
from google import genai
from google.genai import types
from fastapi import HTTPException, status
from app.schemas.chat import ChatRequest, ChatResponse, RawChatRequest
from app.core.key_rotation import get_gemini_api_key
from app.services.database import DatabaseService

logger = logging.getLogger(__name__)

MAX_EXCHANGES_PER_SESSION = 5
LIMIT_EXCEEDED_MESSAGE = "Xin lỗi, bạn đã đạt giới hạn 5 tin nhắn cho phiên này."

class ChatService:
    async def get_chat_response(
        self, 
        payload: ChatRequest, # user request
        user_token: str, 
        db_service: DatabaseService
    ) -> ChatResponse:
        """
        Gửi câu hỏi và phụ đề video tới Gemini 2.5 Flash để nhận câu trả lời.
        Sử dụng cơ chế xoay vòng API key (Key Rotation) để phân phối tải.
        Lưu trữ lịch sử hội thoại tự động vào database Supabase.
        """
        # 1. Lấy lịch sử trò chuyện (chat history) từ database và kiểm tra giới hạn tin nhắn
        history_messages = await db_service.get_chat_history(user_token, payload.session_id)
        if len(history_messages) // 2 >= MAX_EXCHANGES_PER_SESSION:
            return ChatResponse(response=LIMIT_EXCEEDED_MESSAGE)

        api_key = get_gemini_api_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API Key is not configured on the server. Please set GEMINI_API_KEY or GEMINI_API_KEYS in the environment."
            )
            
        client = genai.Client(api_key=api_key)
        
        # 2. Định dạng toàn bộ phụ đề thành ngữ cảnh có chứa timestamp
        transcript_context = ""
        for seg in payload.segments:
            m = int(seg.start // 60)
            s = int(seg.start % 60)
            timestamp_str = f"[{m:02d}:{s:02d}]"
            transcript_context += f"{timestamp_str} {seg.text}\n"

        # 3. Xây dựng System Instruction chỉ dẫn cho Gemini hoạt động như AI Tutor
        system_instruction = (
            "Bạn là một trợ lý học tập AI thông minh, đóng vai trò là Gia sư bài giảng kỹ thuật trực tuyến.\n"
            "Dưới đây là toàn bộ phụ đề bài giảng đã dịch sang tiếng Việt kèm mốc thời gian tương ứng:\n"
            f"====================\n{transcript_context}\n====================\n\n"
            "Nhiệm vụ của bạn:\n"
            "1. Hãy trả lời câu hỏi của học viên một cách rõ ràng, ngắn gọn (TỐI ĐA 200 chữ), dễ hiểu và đi trực tiếp vào nội dung bài giảng. "
            "Sử dụng định dạng Markdown phong phú (tiêu đề, in đậm, danh sách thụt lề, bảng so sánh hoặc code block nếu cần).\n"
            "2. Trả lời bằng tiếng Việt, nhưng GIỮ NGUYÊN các thuật ngữ chuyên ngành kỹ thuật và khoa học máy tính bằng tiếng Anh gốc (ví dụ: 'gradient descent', 'learning rate', 'backpropagation', 'epoch', 'overfitting', 'linked list') để bảo vệ tính học thuật của bài giảng.\n"
            "3. BẮT BUỘC chèn mốc thời gian dạng [MM:SS] (hoặc [HH:MM:SS]) trích xuất chính xác từ phụ đề gốc khi bạn đề cập đến một thông tin hoặc kiến thức có trong video bài giảng, giúp học viên dễ dàng bấm vào xem lại. Ví dụ: 'Khái niệm learning rate được giải thích chi tiết ở [05:12]...'\n"
            "4. Nếu học viên hỏi thông tin chung hoặc tóm tắt, hãy tóm tắt các ý chính kèm theo mốc thời gian bắt đầu của mỗi ý.\n"
            "5. Nếu học viên hỏi những câu hỏi ngoài lề không liên quan đến bài giảng, hãy lịch sự từ chối trả lời và hướng học viên tập trung vào nội dung bài học.\n"
        )

        # 4. Chuẩn bị lịch sử trò chuyện (chat history) đồng bộ theo cấu trúc google-genai
        contents = []
        for msg in history_messages:
            role = "user" if msg["sender"] == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["text"])]
            ))
            
        # Thêm câu hỏi hiện tại của người dùng
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=payload.query)]
        ))

        # 5. Thực hiện cuộc gọi API bất đồng bộ tới Gemini
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3,
        )
        
        models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite"]
        response = None
        last_exception = None

        for idx, model_name in enumerate(models):
            try:
                if idx > 0:
                    logger.warning(f"Fallback to {model_name}...")
                logger.info(f"Sending chatbot request to Gemini using {model_name}...")
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as e:
                last_exception = e
                logger.error(f"Error calling Gemini in ChatService with {model_name}: {e}")

        try:
            if response is None:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"All Gemini models failed. Last error: {str(last_exception)}"
                )
            
            ai_reply = response.text or "Xin lỗi, tôi không thể xử lý câu hỏi này lúc này."
            
            # Lưu cặp tin nhắn (user query & bot response) vào database
            await db_service.save_chat_message(user_token, payload.session_id, payload.query, ai_reply)
            
            return ChatResponse(response=ai_reply)
        finally:
            try:
                await client.aio.aclose()
            except Exception as e:
                logger.warning(f"Failed to close Gemini API client connection: {e}")

    async def get_raw_gemini_response(self, payload: RawChatRequest) -> ChatResponse:
        """
        Gửi prompt và ngữ cảnh phụ đề trực tiếp tới Gemini mà không đọc/ghi lịch sử vào database.
        Phù hợp cho các tác vụ tiện ích như sinh sơ đồ tư duy (Mindmap) hay thẻ học tập (Flashcard).
        """
        api_key = get_gemini_api_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API Key is not configured."
            )
            
        client = genai.Client(api_key=api_key)
        
        # 1. Định dạng phụ đề
        transcript_context = ""
        for seg in payload.segments:
            m = int(seg.start // 60)
            s = int(seg.start % 60)
            timestamp_str = f"[{m:02d}:{s:02d}]"
            transcript_context += f"{timestamp_str} {seg.text}\n"

        # 2. Xây dựng System Instruction chuyên biệt
        system_instruction = (
            "Bạn là một trợ lý AI thông minh hỗ trợ sinh tài liệu học tập.\n"
            "Dưới đây là phụ đề bài giảng:\n"
            f"====================\n{transcript_context}\n====================\n\n"
            "Hãy làm theo yêu cầu trong câu hỏi của người dùng và trả về kết quả chính xác bám sát nội dung phụ đề."
        )

        contents = [types.Content(
            role="user",
            parts=[types.Part.from_text(text=payload.query)]
        )]

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2,
        )
        
        models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite"]
        response = None
        last_exception = None

        for idx, model_name in enumerate(models):
            try:
                if idx > 0:
                    logger.warning(f"Fallback to {model_name}...")
                logger.info(f"Sending raw chatbot request to Gemini using {model_name}...")
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as e:
                last_exception = e
                logger.error(f"Error calling Gemini in get_raw_gemini_response with {model_name}: {e}")

        try:
            if response is None:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"All Gemini models failed. Last error: {str(last_exception)}"
                )
            
            ai_reply = response.text or "Xin lỗi, tôi không thể xử lý yêu cầu lúc này."
            return ChatResponse(response=ai_reply)
        finally:
            try:
                await client.aio.aclose()
            except Exception:
                pass

def get_chat_service() -> ChatService:
    """Dependency injection provider cho ChatService."""
    return ChatService()
