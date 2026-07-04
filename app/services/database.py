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

    async def get_user_sessions(self, user_token: str, user_id: str) -> List[Dict]:
        """
        Lấy danh sách toàn bộ chat sessions của người dùng.
        """
        headers = self._get_headers(user_token)
        url = f"{self.supabase_url}/rest/v1/chat_sessions?user_id=eq.{user_id}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to fetch user sessions. Status: {response.status_code}, Body: {response.text}")
            except Exception as e:
                logger.error(f"Error fetching user sessions: {e}")
            return []

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

    async def get_glossary_term(self, user_token: Optional[str], term: str) -> Optional[Dict[str, str]]:
        """
        Lấy thông tin định nghĩa của thuật ngữ từ bảng glossary_definitions.
        """
        headers = self._get_headers(user_token)
        lower_term = term.strip().lower()
        url = f"{self.supabase_url}/rest/v1/glossary_definitions?term=eq.{lower_term}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    definitions = response.json()
                    if definitions:
                        return definitions[0]
            except Exception as e:
                logger.error(f"Error querying glossary_definitions: {e}")
        return None

    async def save_glossary_term(
        self, 
        user_token: str, 
        term: str, 
        translation: str, 
        definition: str, 
        category: Optional[str] = None
    ):
        """
        Lưu định nghĩa của thuật ngữ mới vào database.
        """
        headers = self._get_headers(user_token)
        url = f"{self.supabase_url}/rest/v1/glossary_definitions"
        payload = {
            "term": term.strip().lower(),
            "translation": translation,
            "definition": definition,
            "category": category or "General"
        }
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code not in (200, 201):
                    logger.error(f"Failed to save glossary term. Status: {res.status_code}, Body: {res.text}")
            except Exception as e:
                logger.error(f"Error saving glossary term to Supabase: {e}")

    async def create_shared_transcript(self, owner_id: str, share_token: str, payload) -> dict:
        headers = self._get_headers()
        headers_with_prefer = headers.copy()
        headers_with_prefer["Prefer"] = "return=representation"
        
        meta_payload = {
            "share_token": share_token,
            "owner_id": owner_id,
            "video_url": str(payload.video_url),
            "video_title": payload.video_title,
            "video_duration_seconds": payload.video_duration_seconds,
            "license_type": payload.license_type,
            "attribution_name": payload.attribution_name or owner_id,
            "is_public": payload.is_public
        }
        
        async with httpx.AsyncClient() as client:
            meta_url = f"{self.supabase_url}/rest/v1/shared_transcripts"
            res = await client.post(meta_url, headers=headers_with_prefer, json=meta_payload)
            if res.status_code not in (200, 201):
                logger.error(f"Failed to create shared transcript meta. Status: {res.status_code}, Body: {res.text}")
                raise Exception(f"Failed to create shared transcript metadata in Supabase: {res.text}")
            
            created_meta = res.json()[0]
            shared_transcript_id = created_meta["id"]
            
            segments_payload = []
            for seg in payload.segments:
                segments_payload.append({
                    "shared_transcript_id": shared_transcript_id,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "original_text": seg.original_text,
                    "translated_text": seg.translated_text,
                    "highlights": seg.highlights,
                    "sequence_number": seg.sequence_number
                })
            
            if segments_payload:
                seg_url = f"{self.supabase_url}/rest/v1/shared_transcript_segments"
                seg_res = await client.post(seg_url, headers=headers, json=segments_payload)
                if seg_res.status_code not in (200, 201):
                    logger.error(f"Failed to insert shared segments. Status: {seg_res.status_code}, Body: {seg_res.text}")
                    raise Exception(f"Failed to insert shared segments in Supabase: {seg_res.text}")
            
            return created_meta

    async def get_shared_transcript_by_token(self, share_token: str) -> Optional[dict]:
        headers = self._get_headers()
        async with httpx.AsyncClient() as client:
            meta_url = f"{self.supabase_url}/rest/v1/shared_transcripts?share_token=eq.{share_token}"
            res = await client.get(meta_url, headers=headers)
            if res.status_code != 200:
                logger.error(f"Failed to query shared_transcripts: {res.text}")
                return None
            
            meta_list = res.json()
            if not meta_list:
                return None
            
            meta = meta_list[0]
            shared_transcript_id = meta["id"]
            
            seg_url = f"{self.supabase_url}/rest/v1/shared_transcript_segments?shared_transcript_id=eq.{shared_transcript_id}&order=sequence_number.asc"
            seg_res = await client.get(seg_url, headers=headers)
            if seg_res.status_code != 200:
                logger.error(f"Failed to query shared_transcript_segments: {seg_res.text}")
                meta["segments"] = []
            else:
                meta["segments"] = seg_res.json()
                
            return meta

    async def get_shared_transcript_metadata_by_token(self, share_token: str) -> Optional[dict]:
        headers = self._get_headers()
        async with httpx.AsyncClient() as client:
            meta_url = f"{self.supabase_url}/rest/v1/shared_transcripts?share_token=eq.{share_token}"
            res = await client.get(meta_url, headers=headers)
            if res.status_code != 200:
                logger.error(f"Failed to query shared_transcripts metadata: {res.text}")
                return None
            meta_list = res.json()
            if not meta_list:
                return None
            return meta_list[0]

    async def increment_share_views(self, share_token: str):
        headers = self._get_headers()
        async with httpx.AsyncClient() as client:
            url = f"{self.supabase_url}/rest/v1/shared_transcripts?share_token=eq.{share_token}"
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                if data:
                    current_views = data[0].get("views_count", 0)
                    patch_url = f"{self.supabase_url}/rest/v1/shared_transcripts?id=eq.{data[0]['id']}"
                    await client.patch(patch_url, headers=headers, json={"views_count": current_views + 1})

    async def increment_share_clones(self, transcript_id: str):
        headers = self._get_headers()
        async with httpx.AsyncClient() as client:
            url = f"{self.supabase_url}/rest/v1/shared_transcripts?id=eq.{transcript_id}"
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                if data:
                    current_clones = data[0].get("clones_count", 0)
                    await client.patch(url, headers=headers, json={"clones_count": current_clones + 1})

    async def upsert_transcript_rating(self, shared_transcript_id: str, user_id: str, rating: int, review_comment: Optional[str]) -> dict:
        headers = self._get_headers()
        headers_with_prefer = headers.copy()
        headers_with_prefer["Prefer"] = "return=representation"
        
        select_url = f"{self.supabase_url}/rest/v1/shared_transcript_ratings?shared_transcript_id=eq.{shared_transcript_id}&user_id=eq.{user_id}"
        async with httpx.AsyncClient() as client:
            res = await client.get(select_url, headers=headers)
            exists = False
            existing_id = None
            if res.status_code == 200:
                data = res.json()
                if data:
                    exists = True
                    existing_id = data[0]["id"]
            
            payload = {
                "shared_transcript_id": shared_transcript_id,
                "user_id": user_id,
                "rating": rating,
                "review_comment": review_comment
            }
            
            if exists:
                patch_url = f"{self.supabase_url}/rest/v1/shared_transcript_ratings?id=eq.{existing_id}"
                res = await client.patch(patch_url, headers=headers_with_prefer, json=payload)
            else:
                insert_url = f"{self.supabase_url}/rest/v1/shared_transcript_ratings"
                res = await client.post(insert_url, headers=headers_with_prefer, json=payload)
                
            if res.status_code not in (200, 201):
                logger.error(f"Failed to upsert rating. Status: {res.status_code}, Body: {res.text}")
                raise Exception(f"Failed to upsert rating in Supabase: {res.text}")
                
            return res.json()[0]

    async def get_ratings_for_transcript(self, shared_transcript_id: str) -> List[dict]:
        headers = self._get_headers()
        url = f"{self.supabase_url}/rest/v1/shared_transcript_ratings?shared_transcript_id=eq.{shared_transcript_id}&order=created_at.desc"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                return res.json()
            logger.error(f"Failed to fetch ratings. Status: {res.status_code}, Body: {res.text}")
            return []

    async def clone_shared_transcript(self, original_id: str, new_owner_id: str, new_share_token: str, original_data: dict) -> dict:
        headers = self._get_headers()
        headers_with_prefer = headers.copy()
        headers_with_prefer["Prefer"] = "return=representation"
        
        meta_payload = {
            "share_token": new_share_token,
            "owner_id": new_owner_id,
            "cloned_from_id": original_id,
            "video_url": original_data["video_url"],
            "video_title": original_data["video_title"],
            "video_duration_seconds": original_data.get("video_duration_seconds"),
            "license_type": original_data["license_type"],
            "attribution_name": original_data.get("attribution_name") or new_owner_id,
            "is_public": False
        }
        
        async with httpx.AsyncClient() as client:
            meta_url = f"{self.supabase_url}/rest/v1/shared_transcripts"
            res = await client.post(meta_url, headers=headers_with_prefer, json=meta_payload)
            if res.status_code not in (200, 201):
                logger.error(f"Failed to create cloned transcript meta. Status: {res.status_code}, Body: {res.text}")
                raise Exception(f"Failed to clone transcript metadata in Supabase: {res.text}")
            
            created_meta = res.json()[0]
            new_transcript_id = created_meta["id"]
            
            segments_payload = []
            for seg in original_data.get("segments", []):
                segments_payload.append({
                    "shared_transcript_id": new_transcript_id,
                    "start_time": seg["start_time"],
                    "end_time": seg["end_time"],
                    "original_text": seg["original_text"],
                    "translated_text": seg["translated_text"],
                    "highlights": seg.get("highlights", []),
                    "sequence_number": seg["sequence_number"]
                })
                
            if segments_payload:
                seg_url = f"{self.supabase_url}/rest/v1/shared_transcript_segments"
                seg_res = await client.post(seg_url, headers=headers, json=segments_payload)
                if seg_res.status_code not in (200, 201):
                    logger.error(f"Failed to clone segments. Status: {seg_res.status_code}, Body: {seg_res.text}")
                    raise Exception(f"Failed to insert cloned segments in Supabase: {seg_res.text}")
                    
            return created_meta

