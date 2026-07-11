from functools import lru_cache

from groq import Groq

from app.core.config import settings


@lru_cache(maxsize=1)
def get_groq_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)
