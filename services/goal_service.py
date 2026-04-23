"""
goal_service.py — Goal Feasibility Simulator
=============================================

Core financial engine for the Goal Feasibility Simulator.

SIP Formula used (standard PMT-for-FV):
    P = FV × r / [((1 + r)^n − 1) × (1 + r)]

where:
    P  = required monthly SIP contribution
    FV = future value / target amount
    r  = monthly interest rate  (annual_rate / 12)
    n  = number of months       (years × 12)

This is the industry-standard SIP PMT formula — it accounts for the fact that
each instalment earns interest from the moment it is invested (beginning-of-period
payment convention), which is why the denominator carries the extra (1 + r) factor.

Feasibility Score (0–100, rule-based):
    - Base score  = (current_monthly_saving / required_sip_moderate) × 70  (capped at 70)
    - Horizon bonus = up to +20 for generous timelines relative to need
    - Risk alignment bonus = up to +10 when user's risk appetite matches horizon
    Total is clamped to [0, 100].
"""

import logging
import math

logger = logging.getLogger(__name__)


# ── SIP PMT formula ────────────────────────────────────────────────────────

def _required_sip(target: float, months: int, annual_rate: float) -> float:
    """
    Return the monthly SIP required to accumulate `target` in `months` months
    at the given annual rate, using beginning-of-period (annuity-due) convention.

    Formula:  P = FV × r / [((1+r)^n − 1) × (1+r)]

    Falls back to simple division when rate == 0 (risk-free / RD scenario).
    """
    if months <= 0:
        return 0.0
    if annual_rate == 0:
        return target / months
    r = annual_rate / 12.0
    return target * r / (((1.0 + r) ** months - 1.0) * (1.0 + r))


def _projected_corpus(monthly_sip: float, months: int, annual_rate: float) -> float:
    """
    Future value of a beginning-of-period SIP stream (annuity-due).

    Formula:  FV = P × [((1+r)^n − 1) / r] × (1+r)

    Falls back to simple multiplication when rate == 0.
    """
    if months <= 0:
        return 0.0
    if annual_rate == 0:
        return monthly_sip * months
    r = annual_rate / 12.0
    return monthly_sip * (((1.0 + r) ** months - 1.0) / r) * (1.0 + r)


# ── Instrument / CAGR matrix ───────────────────────────────────────────────

def _instrument_for_risk(risk: str, years: float) -> dict:
    """
    Return instrument recommendations and CAGR assumptions based on user's
    declared risk appetite and time horizon.

    CAGR tiers:
        Low risk / short horizon  →  5 % / 6 % / 7 %
        Medium risk / mid horizon → 8 % / 10 % / 12 %
        High risk / long horizon  → 10 % / 12 % / 15 %
    """
    if risk == "low" or years <= 1:
        return {
            "primary":           "Recurring Deposit / Liquid Mutual Fund",
            "secondary":         "PPF / Post Office MIS",
            "cagr_conservative": 0.05,
            "cagr_moderate":     0.06,
            "cagr_aggressive":   0.07,
            "rationale":         "Short horizon or low risk — capital preservation is the priority.",
        }
    elif risk == "medium" or years <= 3:
        return {
            "primary":           "Balanced Advantage Fund (BAF) SIP",
            "secondary":         "ELSS / Corporate Bond Fund",
            "cagr_conservative": 0.08,
            "cagr_moderate":     0.10,
            "cagr_aggressive":   0.12,
            "rationale":         "Medium risk or 1–3 year horizon — balanced equity-debt mix recommended.",
        }
    else:
        return {
            "primary":           "Nifty 50 Index Fund SIP",
            "secondary":         "Mid-cap Fund / International Fund",
            "cagr_conservative": 0.10,
            "cagr_moderate":     0.12,
            "cagr_aggressive":   0.15,
            "rationale":         "High risk appetite and long horizon — equity SIPs maximise compounding.",
        }


# ── Feasibility score (rule-based, 0–100) ─────────────────────────────────

def _feasibility_score(
    monthly_savings: float,
    required_sip_moderate: float,
    time_years: float,
    risk: str,
) -> int:
    """
    Compute a 0–100 feasibility score.

    Components:
        1. Savings coverage  (max 70): ratio of current savings to required SIP
        2. Horizon bonus     (max 20): more years = more room to adjust
        3. Risk alignment    (max 10): risk appetite matches recommended horizon
    """
    # 1. Savings coverage
    if required_sip_moderate <= 0:
        coverage = 70.0
    else:
        coverage = min(70.0, (monthly_savings / required_sip_moderate) * 70.0)

    # 2. Horizon bonus — diminishing returns beyond 10 years
    horizon_bonus = min(20.0, (time_years / 10.0) * 20.0)

    # 3. Risk alignment bonus
    if risk == "high" and time_years >= 5:
        risk_bonus = 10.0
    elif risk == "medium" and 2 <= time_years < 5:
        risk_bonus = 7.0
    elif risk == "low" and time_years <= 2:
        risk_bonus = 5.0
    else:
        risk_bonus = 3.0

    raw = coverage + horizon_bonus + risk_bonus
    return int(round(min(100.0, max(0.0, raw))))


# ── Feasibility label ──────────────────────────────────────────────────────

def _feasibility_label(score: int) -> str:
    if score >= 75:
        return "High Feasibility"
    elif score >= 50:
        return "Moderate Feasibility"
    else:
        return "Low Feasibility"


# ── Recommended timeline (months required at moderate CAGR) ───────────────

def _recommended_timeline(
    target: float,
    monthly_savings: float,
    annual_rate: float,
) -> str:
    """
    Binary-search the number of months needed for `monthly_savings` SIP
    to accumulate `target` at `annual_rate`.  Returns a human-readable string.
    """
    if monthly_savings <= 0:
        return "N/A"

    # Upper bound: try up to 40 years
    max_months = 40 * 12
    corpus_at_max = _projected_corpus(monthly_savings, max_months, annual_rate)
    if corpus_at_max < target:
        return "> 40 years"

    lo, hi = 1, max_months
    while lo < hi:
        mid = (lo + hi) // 2
        if _projected_corpus(monthly_savings, mid, annual_rate) >= target:
            hi = mid
        else:
            lo = mid + 1

    months = lo
    years  = months / 12.0
    if years < 1:
        return f"{months} months"
    elif years == int(years):
        return f"{int(years)} year{'s' if years != 1 else ''}"
    else:
        return f"{years:.1f} years"


# ── Three-scenario simulation ──────────────────────────────────────────────

def _build_scenarios(
    target: float,
    months: int,
    instruments: dict,
    monthly_savings: float,
) -> list:
    """
    Return Conservative / Balanced / Aggressive scenario objects, each with:
        scenario       : label
        cagr           : assumption string
        monthly_needed : required SIP
        feasible       : bool
        years          : original horizon
        recommended_timeline : years at that CAGR with current savings
    """
    scenario_defs = [
        ("Conservative", instruments["cagr_conservative"], "#6ee7b7"),
        ("Balanced",     instruments["cagr_moderate"],     "#C8A96E"),
        ("Aggressive",   instruments["cagr_aggressive"],   "#f87171"),
    ]
    results = []
    for label, rate, color in scenario_defs:
        needed = _required_sip(target, months, rate)
        rec_tl = _recommended_timeline(target, monthly_savings, rate)
        results.append({
            "scenario":              label,
            "cagr":                  f"{rate * 100:.0f}%",
            "monthly_needed":        round(needed, 0),
            "feasible":              monthly_savings >= needed,
            "years":                 round(months / 12, 1),
            "recommended_timeline":  rec_tl,
            "color":                 color,
        })
    return results


# ── Main entry point ───────────────────────────────────────────────────────

def calculate_goal_plan(profile: dict, goal_data: dict):
    """
    Run the Goal Feasibility Simulation.

    Returns (True, result_dict) on success, (False, error_string) on failure.
    """
    try:
        goal_name     = str(goal_data.get("goal_name", "My Goal")).strip() or "My Goal"
        target_amount = float(goal_data.get("target_amount", 0))
        time_years    = float(goal_data.get("time_years", 0))

        if target_amount <= 0:
            return False, "target_amount must be greater than 0"
        if time_years <= 0:
            return False, "time_years must be greater than 0"

        monthly_savings = float(profile.get("savings", 0) or 0)
        risk            = (profile.get("risk_appetite") or "medium").lower()
        months          = int(round(time_years * 12))
        instruments     = _instrument_for_risk(risk, time_years)

        # ── Required SIP at each CAGR scenario ──────────────────────────
        sip_conservative = _required_sip(target_amount, months, instruments["cagr_conservative"])
        sip_moderate     = _required_sip(target_amount, months, instruments["cagr_moderate"])
        sip_aggressive   = _required_sip(target_amount, months, instruments["cagr_aggressive"])

        # Primary figure = moderate scenario
        required_sip = sip_moderate
        feasible     = monthly_savings >= required_sip
        gap          = max(0.0, required_sip - monthly_savings)
        surplus      = max(0.0, monthly_savings - required_sip)

        # ── Projected corpus with current savings (moderate CAGR) ────────
        projected_value = _projected_corpus(
            monthly_savings, months, instruments["cagr_moderate"]
        )
        coverage_pct = min(100, round((projected_value / target_amount) * 100))

        # ── Feasibility score & label ────────────────────────────────────
        score = _feasibility_score(monthly_savings, required_sip, time_years, risk)
        label = _feasibility_label(score)

        # ── Recommended timeline at moderate CAGR with current savings ───
        rec_timeline = _recommended_timeline(
            target_amount, monthly_savings, instruments["cagr_moderate"]
        )

        # ── Three scenario simulation ────────────────────────────────────
        scenarios = _build_scenarios(
            target_amount, months, instruments, monthly_savings
        )

        # ── Gap analysis ─────────────────────────────────────────────────
        gap_analysis = {
            "current_monthly_saving": monthly_savings,
            "required_monthly_saving": round(required_sip, 0),
            "monthly_gap":    round(gap, 0),
            "monthly_surplus": round(surplus, 0),
            "feasible":       feasible,
        }

        # ── Scenario message ─────────────────────────────────────────────
        if feasible:
            scenario_message = (
                f"Your current savings of ₹{monthly_savings:,.0f}/month are sufficient "
                f"to reach ₹{target_amount:,.0f} in {time_years:.1f} year(s) at "
                f"{instruments['cagr_moderate'] * 100:.0f}% CAGR. "
                f"You have ₹{surplus:,.0f}/month to spare — consider boosting your "
                f"target or redirecting the surplus to an additional goal."
            )
        else:
            scenario_message = (
                f"Current scenario is not feasible at the {time_years:.1f}-year horizon. "
                f"You need ₹{required_sip:,.0f}/month but are saving ₹{monthly_savings:,.0f}/month — "
                f"a gap of ₹{gap:,.0f}/month. "
                f"At your current saving rate you can reach this goal in {rec_timeline}. "
                f"Consider extending the horizon, increasing savings, or choosing an "
                f"aggressive investment strategy to close the gap."
            )

        return True, {
            # ── Identity ─────────────────────────────────────────────────
            "goal_name":               goal_name,
            "target_amount":           target_amount,
            "time_years":              time_years,
            "months":                  months,

            # ── Primary (moderate) figures ────────────────────────────────
            "required_monthly_saving": round(required_sip, 0),
            "current_monthly_saving":  monthly_savings,
            "monthly_gap":             round(gap, 0),
            "monthly_surplus":         round(surplus, 0),
            "feasible":                feasible,

            # ── Feasibility scoring ───────────────────────────────────────
            "feasibility_score":       score,
            "feasibility_label":       label,

            # ── Timeline ─────────────────────────────────────────────────
            "recommended_timeline":    rec_timeline,

            # ── Corpus projection ────────────────────────────────────────
            "projected_value":         round(projected_value, 0),
            "coverage_pct":            coverage_pct,

            # ── Three scenarios ───────────────────────────────────────────
            "scenarios":               scenarios,

            # ── SIP required at each scenario (convenience fields) ────────
            "sip_conservative":        round(sip_conservative, 0),
            "sip_moderate":            round(sip_moderate, 0),
            "sip_aggressive":          round(sip_aggressive, 0),

            # ── Gap analysis block ────────────────────────────────────────
            "gap_analysis":            gap_analysis,

            # ── Investment strategy ───────────────────────────────────────
            "investment_strategy":     instruments["primary"],
            "investment_suggestion":   instruments["primary"],     # backward compat
            "secondary_suggestion":    instruments["secondary"],
            "rationale":               instruments["rationale"],

            # ── CAGR assumptions (display) ────────────────────────────────
            "cagr_conservative":       f"{instruments['cagr_conservative'] * 100:.0f}%",
            "cagr_moderate":           f"{instruments['cagr_moderate'] * 100:.0f}%",
            "cagr_aggressive":         f"{instruments['cagr_aggressive'] * 100:.0f}%",

            # ── Scenario message ──────────────────────────────────────────
            "scenario_message":        scenario_message,
            "message":                 scenario_message,           # backward compat
        }

    except Exception:
        logger.exception("calculate_goal_plan failed")
        return False, "An unexpected error occurred during simulation"