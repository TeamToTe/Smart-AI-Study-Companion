import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app

class TestAsyncFlow(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.transcribe.celery_app")
    def test_post_async_transcription_returns_accepted(self, mock_celery_app):
        # Arrange
        mock_chain = MagicMock()
        mock_async_result = MagicMock(id="test-task-123")
        mock_chain.apply_async.return_value = mock_async_result
        
        # Patch the celery signature chain creation
        with patch("app.api.transcribe.chain", return_value=mock_chain) as mock_chain_init:
            # Act
            response = self.client.post(
                "/api/transcriptions/async",
                json={"url": "https://www.youtube.com/watch?v=12345678901"}
            )
            
            # Assert
            self.assertEqual(response.status_code, 202)
            data = response.json()
            self.assertEqual(data["task_id"], "test-task-123")
            self.assertEqual(data["status"], "PENDING")
            
            mock_chain_init.assert_called_once()
            mock_chain.apply_async.assert_called_once()

    @patch("app.api.transcribe.AsyncResult")
    def test_get_task_status_pending(self, mock_async_result):
        # Arrange
        mock_result_instance = MagicMock()
        mock_result_instance.state = "PENDING"
        mock_result_instance.result = None
        mock_async_result.return_value = mock_result_instance
        
        # Act
        response = self.client.get("/api/tasks/test-task-123")
        
        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["task_id"], "test-task-123")
        self.assertEqual(data["status"], "PENDING")
        self.assertIsNone(data["result"])

    @patch("app.api.transcribe.AsyncResult")
    def test_get_task_status_success(self, mock_async_result):
        # Arrange
        mock_result_instance = MagicMock()
        mock_result_instance.state = "SUCCESS"
        mock_result_instance.result = {
            "lang": "vi",
            "segments": [
                {"start": 0.0, "end": 2.0, "text": "Xin chào", "domain_words": []}
            ]
        }
        mock_async_result.return_value = mock_result_instance
        
        # Act
        response = self.client.get("/api/tasks/test-task-123")
        
        # Assert
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["task_id"], "test-task-123")
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["result"]["lang"], "vi")
        self.assertEqual(len(data["result"]["segments"]), 1)

class TestRateLimiter(unittest.TestCase):
    @patch("redis.Redis")
    def test_rate_limiter_acquire_success(self, mock_redis_class):
        # Arrange
        mock_redis = MagicMock()
        # Mock Lua script register and call returning 1 (Allowed)
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script
        mock_redis_class.from_url.return_value = mock_redis
        
        from app.core.rate_limiter import RedisTokenBucketRateLimiter
        limiter = RedisTokenBucketRateLimiter(
            redis_url="redis://localhost:6379/0",
            capacity=100,
            fill_rate=1.0
        )
        
        # Act
        allowed = limiter.acquire("groq", tokens_requested=10)
        
        # Assert
        self.assertTrue(allowed)
        mock_redis.register_script.assert_called_once()
        mock_script.assert_called_once()

    @patch("redis.Redis")
    def test_rate_limiter_acquire_limit_exceeded(self, mock_redis_class):
        # Arrange
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 0 # Denied
        mock_redis.register_script.return_value = mock_script
        mock_redis_class.from_url.return_value = mock_redis
        
        from app.core.rate_limiter import RedisTokenBucketRateLimiter
        limiter = RedisTokenBucketRateLimiter(
            redis_url="redis://localhost:6379/0",
            capacity=100,
            fill_rate=1.0
        )
        
        # Act
        allowed = limiter.acquire("groq", tokens_requested=50)
        
        # Assert
        self.assertFalse(allowed)

if __name__ == "__main__":
    unittest.main()
