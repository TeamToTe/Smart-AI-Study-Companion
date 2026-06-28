import os
import httpx
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("ANON_KEY")
        if not self.supabase_url or not self.anon_key:
            logger.warning("Supabase credentials not configured in backend environment variables.")

    def _get_headers(self, user_token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "apikey": self.anon_key or "",
            "Content-Type": "application/json",
        }
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"
        return headers

    async def get_or_create_session(self, user_token: str, user_id: str, video_url: str, video_title: Optional[str] = None) -> str:
        """
        Lấy ra session_id của video_url cho user_id. Nếu chưa có thì tạo mới.
        """
        headers = self._get_headers(user_token)
        async with httpx.AsyncClient() as client:
            # 1. Tìm session cũ
            url = f"{self.supabase_url}/rest/v1/chat_sessions?user_id=eq.{user_id}&video_url=eq.{video_url}"
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    sessions = response.json()
                    if sessions:
                        logger.info(f"Found existing chat session: {sessions[0]['id']}")
                        return sessions[0]["id"]
            except Exception as e:
                logger.error(f"Error querying chat_sessions: {e}")

            # 2. Không tìm thấy, tạo session mới
            url = f"{self.supabase_url}/rest/v1/chat_sessions"
            payload = {
                "user_id": user_id,
                "video_url": video_url,
                "video_title": video_title or ""
            }
            # Thêm header Prefer để trả về dữ liệu vừa insert
            headers_with_prefer = headers.copy()
            headers_with_prefer["Prefer"] = "return=representation"
            
            try:
                response = await client.post(url, headers=headers_with_prefer, json=payload)
                if response.status_code in (200, 201):
                    created_sessions = response.json()
                    if created_sessions:
                        logger.info(f"Created new chat session: {created_sessions[0]['id']}")
                        return created_sessions[0]["id"]
                else:
                    logger.error(f"Failed to create session. Status: {response.status_code}, Body: {response.text}")
            except Exception as e:
                logger.error(f"Error creating chat_session: {e}")
                
            raise Exception("Failed to get or create chat session in Supabase.")

    async def get_chat_history(self, user_token: str, session_id: str) -> List[Dict[str, str]]:
        """
        Lấy toàn bộ lịch sử tin nhắn của session_id, sắp xếp theo created_at ASC.
        Trả về định dạng phẳng: danh sách các tin nhắn của user và bot xen kẽ.
        """
        headers = self._get_headers(user_token)
        url = f"{self.supabase_url}/rest/v1/chat_messages?session_id=eq.{session_id}&order=created_at.asc"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    db_messages = response.json()
                    formatted_messages = []
                    for msg in db_messages:
                        # Thêm tin nhắn của user
                        formatted_messages.append({
                            "sender": "user",
                            "text": msg["user_query"],
                            "time": msg.get("created_at")
                        })
                        # Thêm tin nhắn của bot
                        formatted_messages.append({
                            "sender": "bot",
                            "text": msg["bot_response"],
                            "time": msg.get("created_at")
                        })
                    return formatted_messages
                else:
                    logger.error(f"Failed to fetch history. Status: {response.status_code}, Body: {response.text}")
            except Exception as e:
                logger.error(f"Error fetching chat history: {e}")
            return []

    async def save_chat_message(self, user_token: str, session_id: str, query: str, response: str):
        """
        Lưu một cặp tin nhắn (user query & bot response) vào database.
        """
        headers = self._get_headers(user_token)
        url = f"{self.supabase_url}/rest/v1/chat_messages"
        payload = {
            "session_id": session_id,
            "user_query": query,
            "bot_response": response
        }
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code not in (200, 201):
                    logger.error(f"Failed to save message to Supabase. Status: {res.status_code}, Body: {res.text}")
            except Exception as e:
                logger.error(f"Error saving chat message to Supabase: {e}")
