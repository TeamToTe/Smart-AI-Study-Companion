import unittest
from unittest.mock import AsyncMock, MagicMock
import json

from app.services.translate import _translate_batch_with_fallback

class TestTranslatePrompt(unittest.IsolatedAsyncioTestCase):
    async def test_prompt_uses_key_value_format_not_json(self):
        # Arrange
        mock_client = MagicMock()
        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        
        # Mock completion response
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"segments": []})))
        ]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        batch_segments = [
            {"start": 0.0, "end": 2.5, "text": "Hello world"},
            {"start": 2.5, "end": 5.0, "text": "Deep learning is fun"}
        ]
        lang = "en"
        mock_semaphore = AsyncMock()

        # Act
        await _translate_batch_with_fallback(
            client=mock_client,
            batch_segments=batch_segments,
            lang=lang,
            semaphore=mock_semaphore
        )

        # Assert: verify completions.create was called
        self.assertTrue(mock_client.chat.completions.create.called)
        
        # Get the actual kwargs passed to the call
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        
        system_message = next(msg for msg in messages if msg["role"] == "system")["content"]
        user_message = next(msg for msg in messages if msg["role"] == "user")["content"]

        # The prompt should contain key-value lines for each segment
        expected_line_1 = "start=0.0, end=2.5, text=Hello world"
        expected_line_2 = "start=2.5, end=5.0, text=Deep learning is fun"
        
        self.assertIn(expected_line_1, user_message)
        self.assertIn(expected_line_2, user_message)
        
        # Verify markdown wrapping is forbidden in both system and user instructions
        self.assertIn("markdown code blocks", system_message)
        self.assertIn("markdown code blocks", user_message)

        # The prompt should NOT contain JSON formatted input segments anymore
        self.assertNotIn("Input Segments JSON:", user_message)
        self.assertNotIn('"text": "Hello world"', user_message)

    async def test_translate_cleans_markdown_wrapper(self):
        # Arrange
        mock_client = MagicMock()
        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        
        # Mock completion response wrapped in markdown block
        wrapped_json = "```json\n{\"segments\": [{\"start\": 0.0, \"end\": 2.5, \"text\": \"Xin chào\", \"domain_words\": []}]}\n```"
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=wrapped_json))
        ]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        batch_segments = [{"start": 0.0, "end": 2.5, "text": "Hello"}]
        lang = "en"
        mock_semaphore = AsyncMock()

        # Act
        result = await _translate_batch_with_fallback(
            client=mock_client,
            batch_segments=batch_segments,
            lang=lang,
            semaphore=mock_semaphore
        )

        # Assert: the wrapped markdown block should have been stripped and parsed successfully
        self.assertEqual(len(result["segments"]), 1)
        self.assertEqual(result["segments"][0]["text"], "Xin chào")

if __name__ == "__main__":
    unittest.main()
