import logging
from google import genai
from google.genai import types
from fastapi import HTTPException, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.key_rotation import get_gemini_api_key

logger = logging.getLogger(__name__)

class ChatService:
    async def get_chat_response(self, payload: ChatRequest) -> ChatResponse:
        """
        Gửi câu hỏi và phụ đề video tới Gemini 2.5 Flash để nhận câu trả lời.
        Sử dụng cơ chế xoay vòng API key (Key Rotation) để phân phối tải.
        """
        api_key = get_gemini_api_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API Key is not configured on the server. Please set GEMINI_API_KEY or GEMINI_API_KEYS in the environment."
            )
            
        client = genai.Client(api_key=api_key)
        
        # 1. Định dạng toàn bộ phụ đề thành ngữ cảnh có chứa timestamp
        transcript_context = ""
        for seg in payload.segments:
            m = int(seg.start // 60)
            s = int(seg.start % 60)
            timestamp_str = f"[{m:02d}:{s:02d}]"
            transcript_context += f"{timestamp_str} {seg.text}\n"

        # 2. Xây dựng System Instruction chỉ dẫn cho Gemini hoạt động như AI Tutor
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

        # 3. Chuẩn bị lịch sử trò chuyện (chat history) đồng bộ theo cấu trúc google-genai
        contents = []
        for msg in payload.history:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.content)]
            ))
            
        # Thêm câu hỏi hiện tại của người dùng
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=payload.query)]
        ))

        # 4. Thực hiện cuộc gọi API bất đồng bộ tới Gemini
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,  # Nhiệt độ thấp giúp câu trả lời chính xác, bám sát ngữ cảnh bài học
            )
            
            logger.info("Sending chatbot request to Gemini...")
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )
            
            ai_reply = response.text or "Xin lỗi, tôi không thể xử lý câu hỏi này lúc này."
            return ChatResponse(response=ai_reply)
            
        except Exception as e:
            logger.error(f"Error calling Gemini in ChatService: {e}")
            logger.warning(f"Fallback to gemini-2.5-flash-lite...")
            try:
                logger.info("Sending chatbot request to Gemini...")
                response = await client.aio.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=contents,
                    config=config,
                )    
                ai_reply = response.text or "Xin lỗi, tôi không thể xử lý câu hỏi này lúc này."
                return ChatResponse(response=ai_reply)
            
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Fallback also failed: {str(e)}"
                )
        finally:
            try:
                await client.aio.aclose()
            except Exception as e:
                logger.warning(f"Failed to close Gemini API client connection: {e}")

def get_chat_service() -> ChatService:
    """Dependency injection provider cho ChatService."""
    return ChatService()
