def build_financial_prompt(profile, health_data):
    income = profile['income']
    expenses = profile['expenses']
    savings = profile['savings']
    risk = profile['risk_appetite']
    goals = profile['financial_goals']
    score = health_data['score']
    insights = ", ".join(health_data.get('insights', [])) or "none"
    warnings = ", ".join(health_data.get('warnings', [])) or "none"

    return f"""You are a sharp, concise Indian financial advisor. Write a financial report in clean markdown.

**User profile:**
- Income: ₹{income}/month | Expenses: ₹{expenses}/month | Savings: ₹{savings}/month
- Risk appetite: {risk} | Goals: {goals}
- Health score: {score}/100 | Strengths: {insights} | Warnings: {warnings}

**Output format — use exactly these 5 sections, nothing more:**

## 📊 Summary
2-3 sentences. Overall financial picture. Be direct.

## 💰 Budget Advice
3-4 bullet points. Specific numbers. No fluff.

## 📈 Investment Plan
3-4 bullet points. Specific instruments suited to their risk ({risk}) and goals. Include % allocations.

## ⚠️ Key Risks
2-3 bullet points. Most important risks only.

## ✅ Action Steps
4-5 numbered steps. Concrete, time-bound actions they can take this month.

**Rules:**
- Be direct and specific. Use ₹ amounts.
- No generic advice. No long paragraphs.
- Each section max 5 lines.
- Total response under 350 words.
"""


def build_chat_prompt(profile, query):
    income = profile['income']
    savings = profile['savings']
    risk = profile['risk_appetite']
    goals = profile['financial_goals']

    return f"""You are a friendly but sharp Indian financial advisor chatting with a client.

**Client:** Income ₹{income}/mo | Savings ₹{savings}/mo | Risk: {risk} | Goal: {goals}

**Question:** {query}

**Reply rules:**
- Max 120 words. Conversational but expert.
- Use markdown: **bold** key terms, bullet points for lists, `code` for numbers/percentages.
- If recommending investments, name specific instruments (e.g. Nifty 50 index fund, PPF, ELSS).
- End with one sharp follow-up question or actionable tip on a new line starting with 💡
- No lengthy disclaimers. No filler phrases like "Great question!" or "Certainly!".
"""