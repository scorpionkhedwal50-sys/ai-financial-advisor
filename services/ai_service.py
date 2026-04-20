"""
ai_service.py
=============
Key design decisions:
  - gemini-2.5-flash-preview is EXCLUDED — it shares a global free-tier quota
    pool across all users worldwide, so it exhausts regardless of project.
  - gemini-2.0-flash-lite is PRIMARY — it has the highest free RPM (30/min).
  - On 429 the code waits the exact retryDelay the API specifies, then moves
    to the next model rather than retrying the same exhausted one.
  - On 404 the model name is logged and skipped immediately.
  - The cascade stops at the first successful response.
"""

import logging
import re
import time
import google.genai as genai
from google.genai import errors as genai_errors

from config import Config
from utils.prompt_builder import build_financial_prompt, build_chat_prompt

logger = logging.getLogger(__name__)
client = genai.Client(api_key=Config.GEMINI_API_KEY)

# ── Model cascade ──────────────────────────────────────────────────────────
# Ordered by free-tier generosity. Preview models are intentionally excluded
# because they draw from a shared global quota pool.
_MODELS = [
    "gemini-2.0-flash-lite",   # 30 RPM free — best for dev
    "gemini-2.0-flash",        # 15 RPM free — solid fallback
    "gemini-1.5-flash",        # 15 RPM free — older but stable
    "gemini-1.5-flash-8b",     # 15 RPM free — smallest / fastest
]

_DEFAULT_WAIT = 65   # seconds to wait if retryDelay can't be parsed from error


def _extract_text(response) -> str | None:
    """Pull plain text out of a Gemini response object."""
    try:
        return response.candidates[0].content.parts[0].text
    except Exception:
        pass
    try:
        return response.text
    except Exception:
        return None


def _parse_retry_delay(exc: Exception) -> int:
    """
    Extract retryDelay seconds from a 429 error string.
    The API embeds it as  'retryDelay': '47s'  in the error details.
    Adds a 3-second buffer and caps at 90 seconds.
    """
    try:
        match = re.search(r"retryDelay['\"]?\s*:\s*['\"](\d+(?:\.\d+)?)s", str(exc))
        if match:
            return min(int(float(match.group(1))) + 3, 90)
    except Exception:
        pass
    return _DEFAULT_WAIT


def _generate_with_retry(prompt: str, context: str) -> tuple[bool, str]:
    """
    Walk through _MODELS one by one until a response is obtained.

    Per-model behaviour:
      429 RESOURCE_EXHAUSTED → wait retryDelay, move to next model
      503 UNAVAILABLE        → retry same model once after 5 s, then move on
      404 NOT_FOUND          → skip immediately to next model
      other ClientError      → surface immediately (won't self-resolve)
      success                → return (True, text)
    """
    for model in _MODELS:
        logger.info("%s: trying model '%s'", context, model)
        server_error_retried = False

        while True:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                text = _extract_text(response)
                if text:
                    logger.info(
                        "%s: success with '%s' — %d chars",
                        context, model, len(text),
                    )
                    return True, text

                logger.error(
                    "%s: '%s' returned empty response (finish_reason=%s)",
                    context, model,
                    getattr(
                        getattr(response, "candidates", [{}])[0],
                        "finish_reason", "unknown",
                    ),
                )
                return False, "AI returned an empty response. Please try again."

            except genai_errors.ClientError as exc:
                err = str(exc)

                # 429 — quota exhausted; wait then try next model
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    delay = _parse_retry_delay(exc)
                    logger.warning(
                        "%s: '%s' quota exhausted (429) — waiting %ds then "
                        "trying next model",
                        context, model, delay,
                    )
                    time.sleep(delay)
                    break   # → next model

                # 404 — model not available in this API version; skip
                if "404" in err or "NOT_FOUND" in err:
                    logger.warning(
                        "%s: '%s' not found (404) — skipping to next model",
                        context, model,
                    )
                    break   # → next model

                # Any other 4xx — won't self-resolve
                logger.error(
                    "%s: ClientError with '%s' — %s", context, model, exc
                )
                return False, (
                    "An error occurred while contacting the AI service. "
                    "Please try again."
                )

            except genai_errors.ServerError as exc:
                # 503 — retry the same model once, then move on
                if not server_error_retried:
                    server_error_retried = True
                    logger.warning(
                        "%s: '%s' returned 503 — retrying once in 5s",
                        context, model,
                    )
                    time.sleep(5)
                    continue   # retry same model

                logger.warning(
                    "%s: '%s' still 503 after retry — moving to next model",
                    context, model,
                )
                break   # → next model

            except Exception:
                logger.exception(
                    "%s: unexpected error with model '%s'", context, model
                )
                break   # → next model

    # All models exhausted
    logger.error("%s: all models in cascade exhausted", context)
    return False, (
        "All AI models are currently quota-limited on the free tier. "
        "Please wait a few minutes and try again, or enable billing at "
        "console.cloud.google.com to remove quota limits."
    )


def generate_financial_report(profile: dict, health_data: dict) -> tuple[bool, str]:
    """
    Generate a structured financial advisory report via Gemini.

    Returns (True, report_text) on success, (False, error_msg) on failure.
    """
    context = f"generate_financial_report(user #{profile.get('id', '?')})"
    try:
        prompt = build_financial_prompt(profile, health_data)
    except Exception:
        logger.exception("%s: failed to build prompt", context)
        return False, "Failed to build the report prompt."
    return _generate_with_retry(prompt, context)


def chat_with_advisor(
    profile: dict,
    user_query: str,
    chat_history: list | None = None,
) -> tuple[bool, str]:
    """
    Single-turn chat with the last 6 messages as context.

    Returns (True, response_text) on success, (False, error_msg) on failure.
    """
    context = f"chat_with_advisor(user #{profile.get('id', '?')})"
    try:
        prompt = build_chat_prompt(profile, user_query, chat_history)
    except Exception:
        logger.exception("%s: failed to build prompt", context)
        return False, "Failed to build the chat prompt."
    return _generate_with_retry(prompt, context)