import logging
import google.genai as genai
from config import Config
from utils.prompt_builder import build_financial_prompt, build_chat_prompt

logger = logging.getLogger(__name__)
client = genai.Client(api_key=Config.GEMINI_API_KEY)


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


def generate_financial_report(profile: dict, health_data: dict):
    try:
        prompt   = build_financial_prompt(profile, health_data)
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
        )
        text = _extract_text(response)
        if text:
            return True, text
        logger.error("generate_financial_report: Gemini returned empty response")
        return False, "AI returned an empty response. Please try again."
    except Exception as e:
        logger.exception("generate_financial_report failed")
        return False, f"AI service error: {e}"


def chat_with_advisor(profile: dict, user_query: str, chat_history: list = None):
    """
    chat_history is a list of dicts: [{"role": "user"|"ai", "message": str}, ...]
    The last 6 messages are passed to the prompt for conversation context.
    """
    try:
        prompt   = build_chat_prompt(profile, user_query, chat_history)
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
        )
        text = _extract_text(response)
        if text:
            return True, text
        logger.error("chat_with_advisor: Gemini returned empty response")
        return False, "AI returned an empty response. Please try again."
    except Exception as e:
        logger.exception("chat_with_advisor failed")
        return False, f"AI service error: {e}"