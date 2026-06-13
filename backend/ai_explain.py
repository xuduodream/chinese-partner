import os
import json
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_API_URL = os.getenv("LLM_API_URL")
LLM_MODEL = os.getenv("LLM_MODEL")


def parse_json_response(text: str) -> dict:
    """Attempt to parse JSON from LLM response, handling common issues."""
    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code blocks: ```json ... ``` or ``` ... ```
    match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding the first JSON object ({...}) in the text
    brace_start = text.find('{')
    brace_end = text.rfind('}')
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        candidate = text[brace_start:brace_end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Try cleaning up common LLM issues: trailing commas, single quotes, etc.
    cleaned = text
    # Remove trailing commas before closing braces
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*\]', ']', cleaned)
    # Replace single quotes with double quotes (for property names and values)
    # But only outside of already-escaped sequences
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Last resort: extract key-value pairs with regex
    kv_pattern = re.compile(
        r'["\']?(translation|context|grammar|example)["\']?\s*[:=]\s*["\'](.+?)["\']',
        re.IGNORECASE | re.DOTALL
    )
    matches = kv_pattern.findall(text)
    if matches:
        result = {}
        for key, value in matches:
            result[key.lower()] = value.strip()
        if all(k in result for k in ('translation', 'context', 'grammar', 'example')):
            return result

    raise ValueError(
        f"Could not parse LLM response as JSON. Response:\n{text[:500]}"
    )

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
        return parse_json_response(content)