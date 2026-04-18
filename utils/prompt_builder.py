def build_financial_prompt(profile, health_data):
    return f"""
You are a financial advisor for Indian users.

User:
Income: ₹{profile['income']}
Expenses: ₹{profile['expenses']}
Savings: ₹{profile['savings']}
Risk: {profile['risk_appetite']}
Goals: {profile['financial_goals']}

Health Score: {health_data['score']}

Give:
1. Summary
2. Budget advice
3. Investment plan
4. Risks
5. Action steps
"""


def build_chat_prompt(profile, query):
    return f"""
User:
Income: ₹{profile['income']}
Savings: ₹{profile['savings']}
Risk: {profile['risk_appetite']}

Question: {query}

Give practical advice.
"""