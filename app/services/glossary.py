import json
import logging
from typing import Optional, Dict
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.core.key_rotation import get_gemini_api_key
from app.services.database import DatabaseService
from app.schemas.glossary import GlossaryTermResponse

logger = logging.getLogger(__name__)

class GlossaryService:
    async def get_or_create_definition(
        self,
        term: str,
        user_token: str,
        db_service: DatabaseService
    ) -> GlossaryTermResponse:
        """
        Lấy định nghĩa của thuật ngữ.
        Đầu tiên tìm trong bảng glossary_definitions của Supabase.
        Nếu không có, gọi Gemini API để định nghĩa và lưu vào Supabase.
        """
        term_clean = term.strip()
        
        # 1. Tìm trong Supabase
        db_term = await db_service.get_glossary_term(user_token, term_clean)
        if db_term:
            logger.info(f"Glossary term '{term_clean}' found in Supabase cache.")
            return GlossaryTermResponse(
                term=db_term.get("term", term_clean),
                translation=db_term.get("translation", term_clean),
                definition=db_term.get("definition", "Thuật ngữ trong bài học."),
                category=db_term.get("category", "General")
            )

        # 2. Không tìm thấy, gọi Gemini để định nghĩa
        logger.info(f"Glossary term '{term_clean}' not found in Supabase. Generating definition via Gemini...")
        api_key = get_gemini_api_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API Key is not configured on the server."
            )
            
        client = genai.Client(api_key=api_key)
        
        query_prompt = (
            f"Hãy định nghĩa ngắn gọn thuật ngữ kỹ thuật sau đây trong ngữ cảnh học tập: \"{term_clean}\".\n"
            "Bản dịch tiếng Việt và định nghĩa phải ngắn gọn (khoảng 15-20 từ).\n"
            "Trả về DUY NHẤT một đối tượng JSON hợp lệ chứa cấu trúc chính xác như sau:\n"
            f'{{"term": "{term_clean}", "translation": "bản dịch tiếng Việt", "definition": "định nghĩa ngắn gọn", "category": "lĩnh vực chuyên ngành"}}.\n'
            "Không bao gồm bất kỳ lời dẫn nào, không bọc trong khối code block markdown, chỉ trả về chuỗi JSON thô."
        )

        try:
            models = [
                "gemini-2.5-flash", 
                "gemini-2.5-flash-lite", 
                "gemini-3.1-flash-lite", 
                "gemini-2.0-flash", 
                "gemini-1.5-flash", 
                "gemini-1.5-flash-8b"
            ]
            parsed_def = None
            
            for idx, model_name in enumerate(models):
                try:
                    if idx > 0:
                        logger.warning(f"Fallback to {model_name}...")
                    logger.info(f"Calling Gemini for glossary generation using {model_name}...")
                    response = await client.aio.models.generate_content(
                        model=model_name,
                        contents=query_prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                        )
                    )
                    raw_text = response.text or ""
                    parsed_def = self._parse_gemini_json(raw_text, term_clean)
                    break
                except Exception as e:
                    logger.error(f"Model {model_name} failed for glossary: {e}")

            if parsed_def is None:
                logger.error("All Gemini models failed for glossary generation. Using fallback default.")
                parsed_def = {
                    "term": term_clean,
                    "translation": term_clean,
                    "definition": "Thuật ngữ chuyên ngành trong bài giảng.",
                    "category": "General"
                }
        finally:
            try:
                await client.aio.aclose()
            except Exception as close_err:
                logger.warning(f"Failed to close Gemini API client connection: {close_err}")

        # 3. Lưu vào Supabase để lần sau lấy nhanh
        await db_service.save_glossary_term(
            user_token=user_token,
            term=parsed_def["term"],
            translation=parsed_def["translation"],
            definition=parsed_def["definition"],
            category=parsed_def["category"]
        )

        return GlossaryTermResponse(
            term=parsed_def["term"],
            translation=parsed_def["translation"],
            definition=parsed_def["definition"],
            category=parsed_def["category"]
        )

    def _parse_gemini_json(self, text: str, fallback_term: str) -> Dict[str, str]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            # Remove markdown JSON wrappers
            cleaned = cleaned.replace("```json", "", 1)
            # Remove trailing code block wrapper
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
        try:
            data = json.loads(cleaned)
            return {
                "term": data.get("term") or fallback_term,
                "translation": data.get("translation") or fallback_term,
                "definition": data.get("definition") or "Thuật ngữ trong bài học.",
                "category": data.get("category") or "General"
            }
        except Exception as e:
            logger.error(f"Failed to parse JSON definition response: {e}. Raw content: {text}")
            raise ValueError("Invalid JSON response from LLM model")

def get_glossary_service() -> GlossaryService:
    return GlossaryService()
