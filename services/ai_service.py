from openai import OpenAI
from config import Config

# Initialize OpenAI client
client = OpenAI(
    api_key=Config.OPENAI_API_KEY
)


# -------------------------------
# SYSTEM PERSONA
# -------------------------------
SYSTEM_PROMPT = """
You are FinPilot AI, a professional personal financial advisor.

You specialize in:
- Budgeting
- Savings strategy
- Investing
- Risk management
- Goal planning
- Indian personal finance

Behavior Rules:
- Always give personalized advice.
- Be practical, not generic.
- Use real examples when useful (SIP, index funds, FD, emergency fund etc.)
- Avoid motivational fluff.
- Keep advice concise but meaningful.
- Sound like a real financial advisor.
- If user says simple things like 'hello', greet warmly and offer help.
"""


# -------------------------------
# OPENAI CALL WRAPPER
# -------------------------------
def ask_gpt(prompt):

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=1000,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return True, response.choices[0].message.content.strip()

    except Exception as e:
        return False, str(e)


# -------------------------------
# FINANCIAL REPORT GENERATION
# -------------------------------
def generate_financial_report(profile, health_data):

    prompt = f"""
Analyze this user profile and generate a professional advisory report.

USER PROFILE
Age: {profile['age']}
Monthly Income: ₹{profile['income']}
Monthly Expenses: ₹{profile['expenses']}
Current Savings: ₹{profile['savings']}
Risk Appetite: {profile['risk_appetite']}
Financial Goal: {profile['financial_goals']}

FINANCIAL HEALTH SCORE:
{health_data['score']}/100

Insights:
{', '.join(health_data['insights'])}

Warnings:
{', '.join(health_data['warnings'])}


Return response in this exact structure:

## Financial Summary
Brief assessment of current financial condition.

## Budget Optimization
Specific spending/saving improvements.

## Investment Recommendations
Suggest practical allocation strategy.
Mention percentages if possible.

## Risk Warnings
Mention financial risks or gaps.

## Goal Strategy
How user should achieve stated goal.

## 30-Day Action Plan
Give 5 actionable next steps.

Rules:
- Keep it practical.
- Use Indian finance examples.
- Personalized advice only.
- No generic textbook content.
"""

    return ask_gpt(prompt)


# -------------------------------
# CHAT ADVISOR
# -------------------------------
def chat_with_advisor(profile, user_query, history=None):

    conversation_context = ""

    if history and isinstance(history, list):
        for msg in history[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation_context += f"{role}: {content}\n"

    prompt = f"""
You are the user's personal financial advisor.

User Financial Profile:
Age: {profile['age']}
Income: ₹{profile['income']}
Expenses: ₹{profile['expenses']}
Savings: ₹{profile['savings']}
Risk Appetite: {profile['risk_appetite']}
Goals: {profile['financial_goals']}

Recent Conversation:
{conversation_context}

Current User Message:
{user_query}

Instructions:
- Use user profile for personalized advice
- Use conversation context if relevant
- If user says hello, greet warmly
- Be concise and practical
"""

    return ask_gpt(prompt)