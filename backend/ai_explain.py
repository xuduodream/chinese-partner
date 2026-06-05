import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_API_URL = os.getenv("LLM_API_URL")
LLM_MODEL = os.getenv("LLM_MODEL")

def build_prompt(phrase: str, target_lang: str) -> str:
    """Build prompt for AI based on target language."""
    if target_lang == "fr":
        return f"""You are a Chinese teacher. For the Chinese sentence: "{phrase}"

Respond in JSON format exactly like this:
{{
  "translation": "French translation here",
  "context": "Context of use in French (formal/informal, typical situations)",
  "grammar": "Key grammar points in French",
  "example": "Another similar Chinese sentence with French translation"
}}

Use French for all explanations. Output ONLY valid JSON, nothing else."""

    elif target_lang == "en":
        return f"""You are a Chinese teacher. For the Chinese sentence: "{phrase}"

Respond in JSON format exactly like this:
{{
  "translation": "English translation here",
  "context": "Context of use in English (formal/informal, typical situations)",
  "grammar": "Key grammar points in English",
  "example": "Another similar Chinese sentence with English translation"
}}

Use English for all explanations. Output ONLY valid JSON, nothing else."""

async def explain_phrase(phrase: str, target_lang: str) -> dict:
    """
    Call the LLM API to explain a Chinese phrase.
    Returns dict with keys: translation, context, grammar, example
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            LLM_API_URL,
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": LLM_MODEL,
                "messages": [
                    {"role": "user", "content": build_prompt(phrase, target_lang)}
                ],
                "temperature": 0.3
            }
        )

        if response.status_code != 200:
            raise Exception(f"API error: {response.text}")

        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)