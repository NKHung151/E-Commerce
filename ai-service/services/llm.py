"""Single entry point for LLM calls (OpenAI or a local Ollama).

Clients are created once and reused; previously every chat message built a new
OpenAI / httpx client in two separate places with a 5-minute timeout.
"""
import json
import logging
import re
from typing import Optional

import httpx
from config import settings

logger = logging.getLogger(__name__)

LLM_TIMEOUT = 60.0  # seconds; the chat UI should not hang longer than this
OPENAI_MODEL = "gpt-3.5-turbo"

_http: Optional[httpx.AsyncClient] = None
_openai = None


def _use_openai() -> bool:
    return settings.LLM_PROVIDER == "openai" and bool(settings.OPENAI_API_KEY)


def _http_client() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=LLM_TIMEOUT)
    return _http


def _openai_client():
    global _openai
    if _openai is None:
        from openai import AsyncOpenAI
        _openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=LLM_TIMEOUT)
    return _openai


async def complete(prompt: str, json_mode: bool = False) -> str:
    """Return the model's text. Raises on transport / provider errors."""
    if _use_openai():
        kwargs = {"response_format": {"type": "json_object"}} if json_mode else {}
        resp = await _openai_client().chat.completions.create(
            model=OPENAI_MODEL, messages=[{"role": "user", "content": prompt}], **kwargs
        )
        return resp.choices[0].message.content or ""

    payload = {"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False}
    if json_mode:
        payload["format"] = "json"
    resp = await _http_client().post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
    resp.raise_for_status()
    return resp.json().get("response", "")


def parse_json(text: str) -> dict:
    """Parse a JSON object from model output, tolerating ```json fences."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(cleaned or "{}")


async def close():
    if _http is not None:
        await _http.aclose()
