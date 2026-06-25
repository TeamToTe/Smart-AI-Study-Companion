import asyncio
import json
import logging
import os
import re

from dotenv import load_dotenv
from fastapi import HTTPException, status
from groq import AsyncGroq
from app.schemas.transcription import TranscriptionResponse
from app.schemas.translation import TranslationResponse, TranslationSegment

load_dotenv()
logger = logging.getLogger(__name__)

async def _generate_translation_with_retry(
    client: AsyncGroq,
    model: str,
    prompt: str,
    semaphore: asyncio.Semaphore
) -> dict:
    """
    Attempts to call groq chat completions create for translation up to 3 times.
    Wait times: 20s after 1st failure, 40s after 2nd failure.
    Uses json_object format (standard JSON Mode) under semaphore limit.
    """
    delays = [60.0, 120.0]
    max_tries = 3
    
    async with semaphore:
        for attempt in range(max_tries):
            try:
                logger.info(f"Attempt {attempt + 1} of {max_tries} to translate batch using Groq model {model}...")
                response = await client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a translation assistant. You must respond ONLY with a valid raw JSON object matching "
                                "the requested schema. Do NOT wrap the JSON in markdown code blocks (e.g. do NOT use ```json or ```). "
                                "Do NOT include any conversational or introductory text before or after the JSON. "
                                "Your response must start with '{' and end with '}'."
                            )
                        },
                        {"role": "user", "content": prompt}
                    ],
                    model=model,
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                content_text = response.choices[0].message.content
                if content_text:
                    content_text = content_text.strip()
                    if content_text.startswith("```"):
                        match = re.search(r"^(?:```[a-zA-Z]*\s*\n?)(.*?)(?:\n?\s*```)$", content_text, re.DOTALL)
                        if match:
                            content_text = match.group(1).strip()
                    return json.loads(content_text)
                raise ValueError("Empty response received")
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for batch with model {model}: {e}")
                if attempt < max_tries - 1:
                    delay = delays[attempt]
                    logger.info(f"Waiting {delay} seconds before retrying {model}...")
                    await asyncio.sleep(delay)
                else:
                    raise e


async def _translate_batch_with_fallback(
    client: AsyncGroq,
    batch_segments: list,
    lang: str,
    semaphore: asyncio.Semaphore
) -> dict:
    """
    Translates a batch of up to 20 segments with primary model qwen/qwen3-32b,
    falling back to qwen/qwen3.6-27b if the primary fails.
    """
    segments_str = "\n".join(
        f"start={seg['start']}, end={seg['end']}, text={seg['text']}"
        for seg in batch_segments
    )
    prompt = f"""You are an expert translator and computer science professor fluent in both English and Vietnamese.
Your task is to process a list of timed transcription segments (maximum of 20 segments) and output a JSON response matching the specified structure.
The final translation language must be Vietnamese ('vi').

Instructions:
1. If the input language is NOT Vietnamese (e.g. 'en'):
   - Translate each segment's 'text' to Vietnamese.
   - Crucially, keep machine learning, data science, mathematics, and computer science domain terms in English. DO NOT translate them to Vietnamese. Examples: 'gradient descent', 'learning rate', 'SVD' / 'singular value decomposition', 'neural networks', 'backpropagation', 'epoch', 'batch size', 'loss function', 'overfitting', 'underfitting', etc.
   - For each segment, return all such English domain words that were preserved in that segment in the 'domain_words' list.

2. If the input language is already Vietnamese ('vi'):
   - Scan the segments to identify machine learning, data science, mathematics, and computer science domain terms that have been translated into Vietnamese (e.g. 'hạ độ dốc', 'tốc độ học', 'mạng nơ-ron', 'lan truyền ngược', 'hàm mất mát', etc.).
   - Translate those terms back to their original/standard English equivalents in the text.
   - For each segment, return all such English domain words that were restored in that segment in the 'domain_words' list.

3. The output JSON must strictly follow this structure:
{{
  "segments": [
    {{
      "start": 0.0,
      "end": 1.5,
      "text": "translated or corrected Vietnamese text",
      "domain_words": ["list of technical words kept in English or translated back"]
    }}
  ]
}}
Do NOT wrap the output JSON in markdown code blocks (e.g. do NOT use ```json or ```).

Input Language: {lang}
Input Segments:
{segments_str}"""

    try:
        return await _generate_translation_with_retry(
            client=client,
            model="qwen/qwen3-32b",
            prompt=prompt,
            semaphore=semaphore
        )
    except Exception as primary_err:
        logger.warning(
            f"Primary model qwen/qwen3-32b failed for batch. "
            f"Trying fallback model qwen/qwen3.6-27b. Error: {primary_err}"
        )
        try:
            return await _generate_translation_with_retry(
                client=client,
                model="qwen/qwen3.6-27b",
                prompt=prompt,
                semaphore=semaphore
            )
        except Exception as fallback_err:
            logger.error(f"Fallback model qwen/qwen3.6-27b also failed for batch: {fallback_err}")
            raise fallback_err


class TranslateService:
    async def translate_to_vietnamese(self, transcription: TranscriptionResponse) -> TranslationResponse:
        """
        Translates a transcription response to Vietnamese in batches of 20 segments using the Groq Async Client.
        - Preserves technical domain words in English if the source language is not Vietnamese.
        - Restores technical domain words back to English if the source language is already Vietnamese.
        """
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Groq API Key is not configured on the server. Please set GROQ_API_KEY in the environment."
            )
            
        client = AsyncGroq(api_key=api_key)
        # Limit to 2 concurrent API calls to strictly respect Groq rate limits
        semaphore = asyncio.Semaphore(2)
        
        # Group segments into batches of 20
        batch_size = 10
        batches = [
            transcription.segments[i:i + batch_size] 
            for i in range(0, len(transcription.segments), batch_size)
        ]
        
        async def process_batch(batch):
            batch_segments = [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text
                }
                for seg in batch
            ]
            try:
                res_dict = await _translate_batch_with_fallback(
                    client=client,
                    batch_segments=batch_segments,
                    lang=transcription.lang,
                    semaphore=semaphore
                )
                
                parsed_segs = []
                for seg in res_dict.get("segments", []):
                    parsed_segs.append(
                        TranslationSegment(
                            start=seg.get("start", 0.0),
                            end=seg.get("end", 0.0),
                            text=seg.get("text", ""),
                            domain_words=seg.get("domain_words", [])
                        )
                    )
                return parsed_segs
            except Exception as e:
                logger.error(f"Failed to translate batch starting with segment text '{batch[0].text[:30]}...': {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to translate batch of segments: {str(e)}"
                )
                
        try:
            tasks = [process_batch(b) for b in batches]
            batch_results = await asyncio.gather(*tasks)
            
            # Flatten results from all batches into a single list
            translated_segments = []
            for batch_result in batch_results:
                translated_segments.extend(batch_result)
                
            return TranslationResponse(
                lang="vi",
                segments=translated_segments
            )
        finally:
            try:
                await client.close()
            except Exception as e:
                logger.warning(f"Failed to close Groq client connection: {e}")


def get_translate_service() -> TranslateService:
    """Dependency injection provider for TranslateService."""
    return TranslateService()
