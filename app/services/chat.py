import logging
from google import genai
from google.genai import types
from fastapi import HTTPException, status
from groq import AsyncGroq
from app.schemas.chat import ChatRequest, ChatResponse, RawChatRequest
from app.core.key_rotation import get_gemini_api_key, get_all_gemini_api_keys, get_all_groq_api_keys
from app.services.database import DatabaseService

logger = logging.getLogger(__name__)

MAX_EXCHANGES_PER_SESSION = 5
LIMIT_EXCEEDED_MESSAGE = "Xin lỗi, bạn đã đạt giới hạn 5 tin nhắn cho phiên này."

GROQ_MODELS = [
    'compound-beta', 
    'compound-beta-mini', 
    'gemma2-9b-it', 
    'meta-llama/llama-4-maverick-17b-128e-instruct', 
    'meta-llama/llama-4-scout-17b-16e-instruct', 
    'meta-llama/llama-guard-4-12b', 
    'moonshotai/kimi-k2-instruct'
]

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

        api_keys = get_all_gemini_api_keys()
        groq_keys = get_all_groq_api_keys()
        if not api_keys and not groq_keys:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Neither Gemini nor Groq API Keys are configured on the server."
            )
            
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
            "6. Khi hiển thị các công thức toán học, hãy sử dụng chuẩn LaTeX với dấu ngăn cách cụ thể: sử dụng một dấu đô la đơn giản `$công_thức$` cho công thức viết trực tiếp trong dòng (inline math, ví dụ: `$E = mc^2$`), và sử dụng hai dấu đô la `$$công_thức$$` trên các dòng riêng biệt cho các khối công thức lớn, phức tạp cần hiển thị riêng biệt (block math, ví dụ: `$$\\int_{a}^{b} x^2 dx = \\frac{b^3 - a^3}{3}$$`). Đảm bảo không viết dấu cách sát cạnh dấu `$` (ví dụ: viết `$x$` thay vì `$ x $').\n"
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

        # 5. Thực hiện cuộc gọi API bất đồng bộ tới Gemini với cơ chế xoay vòng và retry Key
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3,
        )
        
        models = [
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash"
        ]
        response = None
        last_exception = None

        for k_idx, api_key in enumerate(api_keys):
            masked = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "..."
            logger.info(f"Attempting chatbot request with Gemini API Key #{k_idx+1}/{len(api_keys)}: {masked}")
            client = genai.Client(api_key=api_key)
            key_error_triggered = False
            
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
                    logger.error(f"Error calling Gemini in ChatService with {model_name} using key {masked}: {e}")
                    
                    err_msg = str(e).lower()
                    if any(x in err_msg for x in ["429", "exhausted", "quota", "limit", "key", "invalid", "401", "403"]):
                        logger.warning(f"Key-level error detected on key {masked}. Skipping this key...")
                        key_error_triggered = True
                        break
            
            try:
                await client.aio.aclose()
            except Exception as close_err:
                logger.warning(f"Failed to close Gemini API client connection for key {masked}: {close_err}")
                
            if response is not None:
                break
            
            if key_error_triggered:
                continue

        ai_reply = None
        if response is not None:
            ai_reply = response.text or "Xin lỗi, tôi không thể xử lý câu hỏi này lúc này."
        else:
            if groq_keys:
                logger.warning("All Gemini keys and models failed. Initiating fallback to Groq...")
                groq_messages = [
                    {"role": "system", "content": system_instruction}
                ]
                for msg in history_messages:
                    role = "user" if msg["sender"] == "user" else "assistant"
                    groq_messages.append({"role": role, "content": msg["text"]})
                groq_messages.append({"role": "user", "content": payload.query})

                for gk_idx, groq_key in enumerate(groq_keys):
                    masked_groq = groq_key[:6] + "..." + groq_key[-4:] if len(groq_key) > 10 else "..."
                    logger.info(f"Attempting fallback chatbot request with Groq API Key #{gk_idx+1}/{len(groq_keys)}: {masked_groq}")
                    groq_client = AsyncGroq(api_key=groq_key)
                    key_error_triggered = False

                    for g_idx, groq_model in enumerate(GROQ_MODELS):
                        try:
                            if g_idx > 0:
                                logger.warning(f"Fallback to Groq model {groq_model}...")
                            logger.info(f"Sending chatbot request to Groq using {groq_model}...")
                            groq_response = await groq_client.chat.completions.create(
                                messages=groq_messages,
                                model=groq_model,
                                temperature=0.3,
                            )
                            if groq_response.choices and groq_response.choices[0].message.content:
                                ai_reply = groq_response.choices[0].message.content.strip()
                                break
                        except Exception as ge:
                            last_exception = ge
                            logger.error(f"Error calling Groq in ChatService with {groq_model} using key {masked_groq}: {ge}")
                            err_msg = str(ge).lower()
                            if any(x in err_msg for x in ["429", "exhausted", "quota", "limit", "key", "invalid", "401", "403"]):
                                logger.warning(f"Groq Key-level error detected on key {masked_groq}. Skipping this key...")
                                key_error_triggered = True
                                break
                    
                    try:
                        await groq_client.close()
                    except Exception as close_err:
                        logger.warning(f"Failed to close Groq API client connection for key {masked_groq}: {close_err}")

                    if ai_reply is not None:
                        break
                    
                    if key_error_triggered:
                        continue

        if ai_reply is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"All Gemini and Groq API keys and models failed. Last error: {str(last_exception)}"
            )
        
        # Lưu cặp tin nhắn (user query & bot response) vào database
        await db_service.save_chat_message(user_token, payload.session_id, payload.query, ai_reply)
        
        return ChatResponse(response=ai_reply)

    async def get_raw_gemini_response(self, payload: RawChatRequest) -> ChatResponse:
        """
        Gửi prompt và ngữ cảnh phụ đề trực tiếp tới Gemini mà không đọc/ghi lịch sử vào database.
        Phù hợp cho các tác vụ tiện ích như sinh sơ đồ tư duy (Mindmap) hay thẻ học tập (Flashcard).
        """
        api_keys = get_all_gemini_api_keys()
        groq_keys = get_all_groq_api_keys()
        if not api_keys and not groq_keys:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Neither Gemini nor Groq API Keys are configured on the server."
            )
            
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
        
        models = [
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash"
        ]
        response = None
        last_exception = None

        for k_idx, api_key in enumerate(api_keys):
            masked = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "..."
            logger.info(f"Attempting raw chatbot request with Gemini API Key #{k_idx+1}/{len(api_keys)}: {masked}")
            client = genai.Client(api_key=api_key)
            key_error_triggered = False
            
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
                    logger.error(f"Error calling Gemini in get_raw_gemini_response with {model_name} using key {masked}: {e}")
                    
                    err_msg = str(e).lower()
                    if any(x in err_msg for x in ["429", "exhausted", "quota", "limit", "key", "invalid", "401", "403"]):
                        logger.warning(f"Key-level error detected on key {masked}. Skipping this key...")
                        key_error_triggered = True
                        break
            
            try:
                await client.aio.aclose()
            except Exception:
                pass
                
            if response is not None:
                break
            
            if key_error_triggered:
                continue

        ai_reply = None
        if response is not None:
            ai_reply = response.text or "Xin lỗi, tôi không thể xử lý yêu cầu lúc này."
        else:
            if groq_keys:
                logger.warning("All Gemini keys and models failed. Initiating fallback to Groq...")
                groq_messages = [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": payload.query}
                ]

                for gk_idx, groq_key in enumerate(groq_keys):
                    masked_groq = groq_key[:6] + "..." + groq_key[-4:] if len(groq_key) > 10 else "..."
                    logger.info(f"Attempting fallback chatbot request with Groq API Key #{gk_idx+1}/{len(groq_keys)}: {masked_groq}")
                    groq_client = AsyncGroq(api_key=groq_key)
                    key_error_triggered = False

                    for g_idx, groq_model in enumerate(GROQ_MODELS):
                        try:
                            if g_idx > 0:
                                logger.warning(f"Fallback to Groq model {groq_model}...")
                            logger.info(f"Sending chatbot request to Groq using {groq_model}...")
                            groq_response = await groq_client.chat.completions.create(
                                messages=groq_messages,
                                model=groq_model,
                                temperature=0.2,
                            )
                            if groq_response.choices and groq_response.choices[0].message.content:
                                ai_reply = groq_response.choices[0].message.content.strip()
                                break
                        except Exception as ge:
                            last_exception = ge
                            logger.error(f"Error calling Groq in get_raw_gemini_response with {groq_model} using key {masked_groq}: {ge}")
                            err_msg = str(ge).lower()
                            if any(x in err_msg for x in ["429", "exhausted", "quota", "limit", "key", "invalid", "401", "403"]):
                                logger.warning(f"Groq Key-level error detected on key {masked_groq}. Skipping this key...")
                                key_error_triggered = True
                                break
                    
                    try:
                        await groq_client.close()
                    except Exception as close_err:
                        logger.warning(f"Failed to close Groq API client connection for key {masked_groq}: {close_err}")

                    if ai_reply is not None:
                        break
                    
                    if key_error_triggered:
                        continue

        if ai_reply is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"All Gemini and Groq API keys and models failed. Last error: {str(last_exception)}"
            )
        
        return ChatResponse(response=ai_reply)

def get_chat_service() -> ChatService:
    """Dependency injection provider cho ChatService."""
    return ChatService()
