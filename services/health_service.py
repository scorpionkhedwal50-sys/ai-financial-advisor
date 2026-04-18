def calculate_health_score(profile):
    income = profile["income"]
    expenses = profile["expenses"]
    savings = profile["savings"]

    score = 0
    insights = []
    warnings = []

    # Savings ratio
    savings_ratio = savings / income if income > 0 else 0

    if savings_ratio >= 0.3:
        score += 40
        insights.append("Excellent savings habit.")
    elif savings_ratio >= 0.2:
        score += 30
        insights.append("Good savings habit.")
    elif savings_ratio >= 0.1:
        score += 20
        warnings.append("Try to increase your savings.")
    else:
        score += 10
        warnings.append("Very low savings.")

    # Expense ratio
    expense_ratio = expenses / income if income > 0 else 0

    if expense_ratio <= 0.5:
        score += 30
        insights.append("Expenses are well controlled.")
    elif expense_ratio <= 0.7:
        score += 20
        warnings.append("Moderate spending.")
    else:
        score += 10
        warnings.append("High expenses.")

    # Emergency fund
    if savings >= (6 * expenses):
        score += 30
        insights.append("Strong emergency fund.")
    elif savings >= (3 * expenses):
        score += 20
        warnings.append("Build stronger emergency fund.")
    else:
        score += 10
        warnings.append("Low emergency fund.")

    return {
        "score": score,
        "insights": insights,
        "warnings": warnings
    }