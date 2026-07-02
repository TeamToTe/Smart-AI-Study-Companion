import os
import random
import logging

logger = logging.getLogger(__name__)

def get_gemini_api_key() -> str:
    """
    Returns a Gemini API key.
    Supports single key in GEMINI_API_KEY or comma-separated keys in GEMINI_API_KEYS.
    Chooses a key randomly to distribute load.
    """
    keys_str = os.getenv("GEMINI_API_KEYS")
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if keys:
            selected = random.choice(keys)
            masked = selected[:6] + "..." + selected[-4:] if len(selected) > 10 else "..."
            logger.info(f"Using rotated Gemini API Key: {masked}")
            return selected
            
    # Fallback to single key
    return os.getenv("GEMINI_API_KEY", "")

def get_all_gemini_api_keys() -> list[str]:
    """
    Returns a list of all configured Gemini API keys, shuffled randomly.
    """
    keys_str = os.getenv("GEMINI_API_KEYS")
    keys = []
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    single_key = os.getenv("GEMINI_API_KEY", "")
    if single_key and single_key not in keys:
        keys.append(single_key)
        
    # Shuffle to distribute load randomly
    random.shuffle(keys)
    return keys

def get_groq_api_key() -> str:
    """
    Returns a Groq API key.
    Supports single key in GROQ_API_KEY or comma-separated keys in GROQ_API_KEYS.
    Chooses a key randomly to distribute load.
    """
    keys_str = os.getenv("GROQ_API_KEYS")
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if keys:
            selected = random.choice(keys)
            masked = selected[:6] + "..." + selected[-4:] if len(selected) > 10 else "..."
            logger.info(f"Using rotated Groq API Key: {masked}")
            return selected
            
    # Fallback to single key
    return os.getenv("GROQ_API_KEY", "")

def get_all_groq_api_keys() -> list[str]:
    """
    Returns a list of all configured Groq API keys, shuffled randomly.
    """
    keys_str = os.getenv("GROQ_API_KEYS")
    keys = []
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    single_key = os.getenv("GROQ_API_KEY", "")
    if single_key and single_key not in keys:
        keys.append(single_key)
        
    random.shuffle(keys)
    return keys
