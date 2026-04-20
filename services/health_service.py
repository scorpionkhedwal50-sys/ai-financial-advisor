import logging

logger = logging.getLogger(__name__)


def calculate_health_score(profile):
    """
    Compute a 0-100 financial health score.

    Returns a dict with:
      score        int   — 0-100
      insights     list  — positive observations
      warnings     list  — areas needing attention
      savings_pct  float — actual savings ratio (0-100) for UI display
      expense_pct  float — actual expense ratio (0-100) for UI display
      emg_months   float — months of expenses covered by current savings
    """
    try:
        income   = float(profile.get("income",   0) or 0)
        expenses = float(profile.get("expenses", 0) or 0)
        savings  = float(profile.get("savings",  0) or 0)
    except (TypeError, ValueError) as e:
        logger.error("health_service: bad numeric value — %s", e)
        return {"score": 0, "insights": [], "warnings": ["Invalid financial data."],
                "savings_pct": 0, "expense_pct": 0, "emg_months": 0}

    score    = 0
    insights = []
    warnings = []

    # ── Real ratios (used both for scoring and returned for UI) ───────────
    savings_ratio = (savings  / income) if income > 0 else 0
    expense_ratio = (expenses / income) if income > 0 else 0
    emg_months    = (savings  / expenses) if expenses > 0 else 0

    # ── 1. Savings ratio (max 40 pts) ─────────────────────────────────────
    if savings_ratio >= 0.30:
        score += 40
        insights.append(f"Strong savings rate of {savings_ratio*100:.0f}% — well above the 20% benchmark.")
    elif savings_ratio >= 0.20:
        score += 30
        insights.append(f"Good savings rate of {savings_ratio*100:.0f}%. Aim for 30% to accelerate goal progress.")
    elif savings_ratio >= 0.10:
        score += 20
        warnings.append(f"Savings rate is only {savings_ratio*100:.0f}%. Try to reach at least 20% of income.")
    else:
        score += 10
        warnings.append(f"Critical: savings rate is {savings_ratio*100:.0f}%. Review all discretionary expenses immediately.")

    # ── 2. Expense ratio (max 30 pts) ─────────────────────────────────────
    if expense_ratio <= 0.50:
        score += 30
        insights.append(f"Expenses are well controlled at {expense_ratio*100:.0f}% of income.")
    elif expense_ratio <= 0.70:
        score += 20
        warnings.append(f"Expenses consume {expense_ratio*100:.0f}% of income. Target below 70%.")
    else:
        score += 10
        warnings.append(f"High expense ratio of {expense_ratio*100:.0f}%. This leaves little room for savings or emergencies.")

    # ── 3. Emergency fund (max 30 pts) ────────────────────────────────────
    if emg_months >= 6:
        score += 30
        insights.append(f"Emergency fund covers {emg_months:.1f} months of expenses — solid financial cushion.")
    elif emg_months >= 3:
        score += 20
        warnings.append(f"Emergency fund covers {emg_months:.1f} months. Build up to 6 months for security.")
    else:
        score += 10
        warnings.append(f"Emergency fund covers only {emg_months:.1f} months. This is a priority fix.")

    # ── Convert ratios to 0-100 percentages for UI progress bars ──────────
    # Cap at 100 so a savings_ratio of 0.45 shows as 100% (excellent) not 45%
    savings_pct = min(100, round(savings_ratio * 100 / 0.30 * 100))   # 30% = 100 on bar
    expense_pct = min(100, round((1 - expense_ratio) * 100))           # lower expense = higher bar
    emg_pct     = min(100, round(emg_months / 6 * 100))               # 6 months = 100 on bar

    return {
        "score":       score,
        "insights":    insights,
        "warnings":    warnings,
        # Real values for UI bars
        "savings_pct": savings_pct,
        "expense_pct": expense_pct,
        "emg_pct":     emg_pct,
        # Raw values useful for the AI prompt
        "savings_ratio": round(savings_ratio * 100, 1),
        "expense_ratio": round(expense_ratio * 100, 1),
        "emg_months":    round(emg_months, 1),
    }