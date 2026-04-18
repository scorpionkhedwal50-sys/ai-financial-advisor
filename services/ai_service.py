import google.genai as genai
from config import Config
from utils.prompt_builder import build_financial_prompt, build_chat_prompt

client = genai.Client(api_key=Config.GEMINI_API_KEY)


def extract_text(response):
    try:
        # New structure
        return response.candidates[0].content.parts[0].text
    except:
        try:
            return response.text
        except:
            return None


def generate_financial_report(profile, health_data):
    try:
        prompt = build_financial_prompt(profile, health_data)

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )

        text = extract_text(response)

        if text:
            return True, text
        else:
            return False, "AI returned empty response"

    except Exception as e:
        return False, str(e)


def chat_with_advisor(profile, user_query):
    try:
        prompt = build_chat_prompt(profile, user_query)

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )

        text = extract_text(response)

        if text:
            return True, text
        else:
            return False, "AI returned empty response"

    except Exception as e:
        return False, str(e)