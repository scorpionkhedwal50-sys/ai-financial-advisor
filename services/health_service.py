"""
health_service.py — Financial health scorer
============================================
Scoring breakdown (total 100 pts):

  Pillar                      Max pts   Key threshold
  ─────────────────────────── ───────   ─────────────────────────────────
  1. Savings rate              25        ≥30 % → full marks
  2. Expense control           20        ≤50 % of income → full marks
  3. Emergency fund            20        ≥6 months → full marks
  4. Debt-to-income ratio      15        ≤20 % DTI → full marks  (if provided)
  5. Retirement adequacy       10        age-adjusted corpus check
  6. Tax efficiency             5        80C utilisation estimate
  7. Surplus buffer             5        any positive surplus → base points

Total possible: 100 pts
"""

import logging

logger = logging.getLogger(__name__)


# ── Constants ──────────────────────────────────────────────────────────────

# Pillar weights
W_SAVINGS     = 25
W_EXPENSE     = 20
W_EMERGENCY   = 20
W_DEBT        = 15
W_RETIREMENT  = 10
W_TAX         =  5
W_SURPLUS     =  5

# Thresholds
SAVINGS_EXCELLENT = 0.30   # 30 %
SAVINGS_GOOD      = 0.20
SAVINGS_FAIR      = 0.10

EXPENSE_EXCELLENT = 0.50   # spending ≤ 50 % of income
EXPENSE_GOOD      = 0.70

EMG_EXCELLENT     = 6      # months
EMG_GOOD          = 3

DTI_EXCELLENT     = 0.20   # debt repayment ≤ 20 % of income
DTI_MODERATE      = 0.35
DTI_HIGH          = 0.50

# Retirement: target corpus = 25× annual expenses (4 % withdrawal rule)
# We score by how much of the journey is already covered at current savings rate.
CORPUS_MULTIPLIER = 25     # 4 % SWR
RETIREMENT_AGE    = 60     # assumed retirement age

# 80C limit (FY 2024-25)
SECTION_80C_LIMIT = 150_000


def _score_savings(savings_ratio: float) -> tuple[int, list, list]:
    insights, warnings = [], []
    if savings_ratio >= SAVINGS_EXCELLENT:
        pts = W_SAVINGS
        insights.append(
            f"Excellent savings rate of {savings_ratio*100:.0f}% — "
            f"well above the 20% benchmark."
        )
    elif savings_ratio >= SAVINGS_GOOD:
        pts = round(W_SAVINGS * 0.80)
        insights.append(
            f"Good savings rate of {savings_ratio*100:.0f}%. "
            f"Pushing to 30% will meaningfully accelerate goal attainment."
        )
    elif savings_ratio >= SAVINGS_FAIR:
        pts = round(W_SAVINGS * 0.55)
        warnings.append(
            f"Savings rate of {savings_ratio*100:.0f}% is below the 20% benchmark. "
            f"Identify and cut at least one major expense category."
        )
    elif savings_ratio > 0:
        pts = round(W_SAVINGS * 0.25)
        warnings.append(
            f"Critical: savings rate is only {savings_ratio*100:.0f}%. "
            f"Review all discretionary spending immediately."
        )
    else:
        pts = 0
        warnings.append(
            "No savings detected. Building even a small emergency buffer is the first priority."
        )
    return pts, insights, warnings


def _score_expense(expense_ratio: float) -> tuple[int, list, list]:
    insights, warnings = [], []
    if expense_ratio <= EXPENSE_EXCELLENT:
        pts = W_EXPENSE
        insights.append(
            f"Expenses tightly controlled at {expense_ratio*100:.0f}% of income."
        )
    elif expense_ratio <= EXPENSE_GOOD:
        pts = round(W_EXPENSE * 0.70)
        warnings.append(
            f"Expenses at {expense_ratio*100:.0f}% of income leave limited room for saving. "
            f"Target below 70%."
        )
    elif expense_ratio < 1.0:
        pts = round(W_EXPENSE * 0.35)
        warnings.append(
            f"High expense ratio of {expense_ratio*100:.0f}%. "
            f"This is unsustainable long-term — audit subscriptions and lifestyle costs."
        )
    else:
        pts = 0
        warnings.append(
            f"Expenses exceed income ({expense_ratio*100:.0f}% ratio). "
            f"This is a critical cash-flow deficit — immediate corrective action needed."
        )
    return pts, insights, warnings


def _score_emergency(emg_months: float) -> tuple[int, list, list]:
    insights, warnings = [], []
    if emg_months >= EMG_EXCELLENT:
        pts = W_EMERGENCY
        insights.append(
            f"Emergency fund covers {emg_months:.1f} months of expenses — solid cushion."
        )
    elif emg_months >= EMG_GOOD:
        pts = round(W_EMERGENCY * 0.65)
        warnings.append(
            f"Emergency fund covers {emg_months:.1f} months. "
            f"Build to 6 months for adequate protection."
        )
    elif emg_months >= 1:
        pts = round(W_EMERGENCY * 0.30)
        warnings.append(
            f"Emergency fund covers only {emg_months:.1f} months — "
            f"a single adverse event could derail your finances."
        )
    else:
        pts = 0
        warnings.append(
            "No meaningful emergency fund. Prioritise building 3–6 months of expenses "
            "in a liquid instrument (savings account or liquid mutual fund) before investing."
        )
    return pts, insights, warnings


def _score_debt(dti: float | None) -> tuple[int, list, list]:
    """
    dti = monthly_debt_repayment / monthly_income.
    If the profile doesn't include debt data, award partial credit
    (we can't penalise for missing information).
    """
    insights, warnings = [], []
    if dti is None:
        # Partial credit when debt data is unavailable
        pts = round(W_DEBT * 0.50)
        warnings.append(
            "Debt repayment data not provided. "
            "Track all EMIs to get a complete debt-to-income picture."
        )
        return pts, insights, warnings

    if dti <= DTI_EXCELLENT:
        pts = W_DEBT
        insights.append(
            f"Debt-to-income ratio of {dti*100:.0f}% is healthy (≤20% benchmark)."
        )
    elif dti <= DTI_MODERATE:
        pts = round(W_DEBT * 0.60)
        warnings.append(
            f"DTI of {dti*100:.0f}% is moderate. "
            f"Aim to reduce EMI burden below 20% of income."
        )
    elif dti <= DTI_HIGH:
        pts = round(W_DEBT * 0.25)
        warnings.append(
            f"High DTI of {dti*100:.0f}%. "
            f"Aggressive debt repayment should take priority over new investments."
        )
    else:
        pts = 0
        warnings.append(
            f"Critical DTI of {dti*100:.0f}%. "
            f"Debt repayment consumes more than half your income — seek debt restructuring."
        )
    return pts, insights, warnings


def _score_retirement(
    age: int | None,
    income: float,
    expenses: float,
    savings: float,
) -> tuple[int, list, list]:
    """
    Estimate retirement readiness using the 4% withdrawal rule.
    Target corpus = 25 × annual expenses.
    Projected corpus = FV of current monthly savings at 10% CAGR (equity assumption).
    """
    insights, warnings = [], []

    if age is None or age <= 0 or age >= RETIREMENT_AGE:
        pts = round(W_RETIREMENT * 0.50)
        warnings.append(
            "Age not provided or already at/past retirement age — "
            "retirement adequacy could not be assessed."
        )
        return pts, insights, warnings

    years_left   = RETIREMENT_AGE - age
    months_left  = years_left * 12
    annual_exp   = expenses * 12
    target_corpus = CORPUS_MULTIPLIER * annual_exp

    if target_corpus <= 0:
        return round(W_RETIREMENT * 0.50), insights, warnings

    # FV of SIP: M × [((1+r)^n − 1) / r] × (1+r),  r = 10% CAGR / 12
    r = 0.10 / 12
    if r > 0 and months_left > 0:
        fv = savings * (((1 + r) ** months_left - 1) / r) * (1 + r)
    else:
        fv = savings * months_left

    coverage = min(fv / target_corpus, 1.0) if target_corpus > 0 else 0

    if coverage >= 0.80:
        pts = W_RETIREMENT
        insights.append(
            f"On track for retirement: projected corpus covers "
            f"{coverage*100:.0f}% of the ₹{target_corpus:,.0f} target "
            f"(25× annual expenses) at age {RETIREMENT_AGE}."
        )
    elif coverage >= 0.50:
        pts = round(W_RETIREMENT * 0.60)
        warnings.append(
            f"Retirement corpus projected at {coverage*100:.0f}% of the "
            f"₹{target_corpus:,.0f} target. Increase SIP or extend working years."
        )
    elif coverage >= 0.25:
        pts = round(W_RETIREMENT * 0.30)
        warnings.append(
            f"Retirement shortfall: only {coverage*100:.0f}% of ₹{target_corpus:,.0f} "
            f"projected. With {years_left} years left, a step-up SIP strategy is essential."
        )
    else:
        pts = 0
        warnings.append(
            f"Significant retirement gap: current savings trajectory covers "
            f"less than 25% of the required corpus. Start a dedicated retirement SIP immediately."
        )
    return pts, insights, warnings


def _score_tax(savings: float, income: float) -> tuple[int, list, list]:
    """
    Proxy for tax efficiency: estimate 80C headroom.
    Assumes ~30% of savings goes to 80C instruments (ELSS, PPF, EPF).
    This is a heuristic — real data would require declared investments.
    """
    insights, warnings = [], []

    if income <= 0:
        return 0, insights, warnings

    estimated_80c = savings * 0.30   # rough proxy
    utilisation   = min(estimated_80c / SECTION_80C_LIMIT, 1.0)

    if utilisation >= 0.80:
        pts = W_TAX
        insights.append(
            "80C limit appears well-utilised based on savings pattern — "
            "good tax efficiency."
        )
    elif utilisation >= 0.40:
        pts = round(W_TAX * 0.60)
        warnings.append(
            f"Estimated 80C utilisation is ~{utilisation*100:.0f}%. "
            f"Ensure PPF / ELSS / EPF contributions reach ₹1.5L to maximise deduction."
        )
    else:
        pts = round(W_TAX * 0.20)
        warnings.append(
            "Low estimated 80C utilisation. Up to ₹1.5L of income can be shielded via "
            "ELSS, PPF, or EPF — review your tax-saving investments."
        )
    return pts, insights, warnings


def _score_surplus(surplus: float) -> tuple[int, list, list]:
    insights, warnings = [], []
    if surplus > 0:
        pts = W_SURPLUS
        insights.append(
            f"Positive monthly surplus of ₹{surplus:,.0f} available for investment."
        )
    elif surplus == 0:
        pts = round(W_SURPLUS * 0.40)
        warnings.append("Income equals expenses — no free surplus for investment or savings growth.")
    else:
        pts = 0
        warnings.append(
            f"Negative surplus (deficit of ₹{abs(surplus):,.0f}/month). "
            f"Expenditure restructuring is urgently required."
        )
    return pts, insights, warnings


# ── UI bar normalisation ───────────────────────────────────────────────────

def _bar_pct(value: float, excellent_threshold: float) -> int:
    """Scale a raw value to a 0-100 bar percentage, capped at 100."""
    if excellent_threshold <= 0:
        return 0
    return min(100, round((value / excellent_threshold) * 100))


# ── Public API ─────────────────────────────────────────────────────────────

def calculate_health_score(profile: dict) -> dict:
    """
    Compute a 0-100 financial health score across 7 pillars.

    Returns
    -------
    dict with:
      score        int   — 0 to 100
      insights     list  — positive observations
      warnings     list  — areas needing attention
      savings_pct  int   — 0-100 bar value for UI
      expense_pct  int   — 0-100 bar value for UI
      emg_pct      int   — 0-100 bar value for UI
      savings_ratio float — actual % (for prompt builder)
      expense_ratio float — actual % (for prompt builder)
      emg_months    float — months covered (for prompt builder)
      pillar_scores dict  — per-pillar breakdown for transparency
    """
    try:
        income       = float(profile.get("income",   0) or 0)
        expenses     = float(profile.get("expenses", 0) or 0)
        savings      = float(profile.get("savings",  0) or 0)
        age_raw      = profile.get("age")
        debt_emi_raw = profile.get("debt_emi")   # optional field

        age      = int(age_raw)      if age_raw      not in (None, "", "unknown") else None
        debt_emi = float(debt_emi_raw) if debt_emi_raw not in (None, "", 0)       else None

    except (TypeError, ValueError) as exc:
        logger.error("health_service: type error parsing profile — %s", exc)
        return {
            "score": 0, "insights": [], "warnings": ["Invalid financial data provided."],
            "savings_pct": 0, "expense_pct": 0, "emg_pct": 0,
            "savings_ratio": 0, "expense_ratio": 0, "emg_months": 0,
            "pillar_scores": {},
        }

    surplus       = income - expenses
    savings_ratio = (savings  / income)   if income   > 0 else 0
    expense_ratio = (expenses / income)   if income   > 0 else 0
    emg_months    = (savings  / expenses) if expenses > 0 else 0
    dti           = (debt_emi / income)   if (debt_emi is not None and income > 0) else None

    all_insights: list[str] = []
    all_warnings: list[str] = []
    pillar_scores: dict     = {}

    # 1. Savings rate
    pts, ins, wrn = _score_savings(savings_ratio)
    pillar_scores["savings_rate"]    = pts
    all_insights += ins; all_warnings += wrn

    # 2. Expense control
    pts, ins, wrn = _score_expense(expense_ratio)
    pillar_scores["expense_control"] = pts
    all_insights += ins; all_warnings += wrn

    # 3. Emergency fund
    pts, ins, wrn = _score_emergency(emg_months)
    pillar_scores["emergency_fund"]  = pts
    all_insights += ins; all_warnings += wrn

    # 4. Debt-to-income
    pts, ins, wrn = _score_debt(dti)
    pillar_scores["debt_ratio"]      = pts
    all_insights += ins; all_warnings += wrn

    # 5. Retirement adequacy
    pts, ins, wrn = _score_retirement(age, income, expenses, savings)
    pillar_scores["retirement"]      = pts
    all_insights += ins; all_warnings += wrn

    # 6. Tax efficiency
    pts, ins, wrn = _score_tax(savings, income)
    pillar_scores["tax_efficiency"]  = pts
    all_insights += ins; all_warnings += wrn

    # 7. Surplus buffer
    pts, ins, wrn = _score_surplus(surplus)
    pillar_scores["surplus_buffer"]  = pts
    all_insights += ins; all_warnings += wrn

    total_score = min(100, sum(pillar_scores.values()))

    # UI bar values (0-100)
    savings_pct = _bar_pct(savings_ratio, SAVINGS_EXCELLENT)
    expense_pct = min(100, round((1 - expense_ratio) * 100))   # lower expense → higher bar
    emg_pct     = _bar_pct(emg_months, EMG_EXCELLENT)

    return {
        "score":         total_score,
        "insights":      all_insights,
        "warnings":      all_warnings,
        # UI progress bars
        "savings_pct":   savings_pct,
        "expense_pct":   expense_pct,
        "emg_pct":       emg_pct,
        # Raw values for AI prompt builder
        "savings_ratio": round(savings_ratio * 100, 1),
        "expense_ratio": round(expense_ratio * 100, 1),
        "emg_months":    round(emg_months, 1),
        "surplus":       round(surplus, 2),
        "dti_ratio":     round(dti * 100, 1) if dti is not None else None,
        # Per-pillar breakdown
        "pillar_scores": pillar_scores,
    }