import logging
import google.genai as genai

from config import Config
from utils.prompt_builder import build_financial_prompt, build_chat_prompt

logger = logging.getLogger(__name__)
client = genai.Client(api_key=Config.GEMINI_API_KEY)

_MODEL = "models/gemini-2.5-flash"


def _extract_text(response) -> str | None:
    """Pull the text string out of a Gemini response object."""
    try:
        return response.candidates[0].content.parts[0].text
    except Exception:
        pass
    try:
        return response.text
    except Exception:
        return None


def generate_financial_report(profile: dict, health_data: dict) -> tuple[bool, str]:
    """
    Generate a structured financial advisory report via Gemini.

    Returns
    -------
    (True, report_text)  on success
    (False, error_msg)   on failure — full traceback is logged at ERROR level
    """
    try:
        prompt   = build_financial_prompt(profile, health_data)
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
        )
        text = _extract_text(response)
        if text:
            logger.info(
                "generate_financial_report: success — %d chars returned for user #%s",
                len(text), profile.get("id", "?"),
            )
            return True, text

        logger.error(
            "generate_financial_report: Gemini returned an empty response "
            "(finish_reason=%s)",
            getattr(getattr(response, "candidates", [{}])[0], "finish_reason", "unknown"),
        )
        return False, "AI returned an empty response. Please try again."

    except Exception:
        # Log the FULL traceback so it appears in server logs
        logger.exception(
            "generate_financial_report: unhandled exception for user #%s",
            profile.get("id", "?"),
        )
        return False, "AI service error — please try again later."


def chat_with_advisor(
    profile: dict,
    user_query: str,
    chat_history: list | None = None,
) -> tuple[bool, str]:
    """
    Single-turn chat with conversation context.

    chat_history — list of {"role": "user"|"ai", "message": str}
    The last 6 messages are included in the prompt for context.

    Returns
    -------
    (True, response_text)  on success
    (False, error_msg)     on failure — full traceback logged at ERROR level
    """
    try:
        prompt   = build_chat_prompt(profile, user_query, chat_history)
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
        )
        text = _extract_text(response)
        if text:
            logger.info(
                "chat_with_advisor: success — %d chars returned for user #%s",
                len(text), profile.get("id", "?"),
            )
            return True, text

        logger.error(
            "chat_with_advisor: Gemini returned an empty response "
            "(finish_reason=%s)",
            getattr(getattr(response, "candidates", [{}])[0], "finish_reason", "unknown"),
        )
        return False, "AI returned an empty response. Please try again."

    except Exception:
        logger.exception(
            "chat_with_advisor: unhandled exception for user #%s — query: %.80r",
            profile.get("id", "?"), user_query,
        )
        return False, "AI service error — please try again later."