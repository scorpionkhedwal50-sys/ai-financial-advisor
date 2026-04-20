import logging
import math

logger = logging.getLogger(__name__)


def _required_sip(target: float, months: int, annual_rate: float) -> float:
    """
    PMT formula for SIP:
        P = FV × r / [((1+r)^n − 1) × (1+r)]
    where r = monthly rate, n = number of months.
    Returns 0 if rate is 0 (falls back to simple division).
    """
    if annual_rate == 0 or months == 0:
        return target / months if months else 0
    r = annual_rate / 12
    return target * r / (((1 + r) ** months - 1) * (1 + r))


def _instrument_for_risk(risk: str, years: float) -> dict:
    """
    Return the recommended instruments, expected CAGR scenarios,
    and a rationale string based on risk appetite and time horizon.
    """
    if risk == "low" or years <= 1:
        return {
            "primary":    "Recurring Deposit / Liquid Mutual Fund",
            "secondary":  "PPF / Post Office MIS",
            "cagr_conservative": 0.05,
            "cagr_moderate":     0.06,
            "cagr_aggressive":   0.07,
            "rationale": "Short horizon or low risk — capital preservation is priority.",
        }
    elif risk == "medium" or years <= 3:
        return {
            "primary":    "Balanced Advantage Fund (BAF) SIP",
            "secondary":  "ELSS / Corporate Bond Fund",
            "cagr_conservative": 0.08,
            "cagr_moderate":     0.10,
            "cagr_aggressive":   0.12,
            "rationale": "Medium risk or 1–3 year horizon — balanced equity-debt mix.",
        }
    else:
        return {
            "primary":    "Nifty 50 Index Fund SIP",
            "secondary":  "Mid-cap Fund / International Fund",
            "cagr_conservative": 0.10,
            "cagr_moderate":     0.12,
            "cagr_aggressive":   0.15,
            "rationale": "High risk appetite and long horizon — equity SIPs maximise growth.",
        }


def calculate_goal_plan(profile, goal_data):
    try:
        target_amount = float(goal_data.get("target_amount", 0))
        time_years    = float(goal_data.get("time_years", 0))

        if target_amount <= 0:
            return False, "target_amount must be greater than 0"
        if time_years <= 0:
            return False, "time_years must be greater than 0"

        monthly_savings = float(profile.get("savings", 0) or 0)
        risk            = profile.get("risk_appetite", "medium")
        months          = time_years * 12
        instruments     = _instrument_for_risk(risk, time_years)

        # ── Required SIP at 3 CAGR scenarios ──────────────────────────────
        sip_conservative = _required_sip(target_amount, months,
                                         instruments["cagr_conservative"])
        sip_moderate     = _required_sip(target_amount, months,
                                         instruments["cagr_moderate"])
        sip_aggressive   = _required_sip(target_amount, months,
                                         instruments["cagr_aggressive"])

        # ── Primary scenario = moderate ───────────────────────────────────
        required_sip = sip_moderate
        feasible     = monthly_savings >= required_sip
        gap          = max(0, required_sip - monthly_savings)

        # ── How much the user will accumulate at moderate CAGR ────────────
        r = instruments["cagr_moderate"] / 12
        projected_value = (
            monthly_savings * (((1 + r) ** months - 1) / r) * (1 + r)
            if r > 0 else monthly_savings * months
        )
        coverage_pct = min(100, round((projected_value / target_amount) * 100))

        if feasible:
            surplus_monthly = monthly_savings - required_sip
            message = (
                f"Goal is achievable at {instruments['cagr_moderate']*100:.0f}% CAGR. "
                f"You have ₹{surplus_monthly:,.0f}/month to spare — "
                f"consider increasing your target or investing the surplus."
            )
        else:
            message = (
                f"At {instruments['cagr_moderate']*100:.0f}% CAGR you need ₹{gap:,.0f}/month more. "
                f"Try extending the time horizon or switching to a higher-return instrument."
            )

        return True, {
            "target_amount":           target_amount,
            "time_years":              time_years,
            "months":                  int(months),
            # Required SIP at each CAGR scenario
            "sip_conservative":        round(sip_conservative, 0),
            "sip_moderate":            round(sip_moderate, 0),
            "sip_aggressive":          round(sip_aggressive, 0),
            # The primary figure shown in the UI
            "required_monthly_saving": round(required_sip, 0),
            "current_monthly_saving":  monthly_savings,
            "feasible":                feasible,
            "gap":                     round(gap, 0),
            "message":                 message,
            "coverage_pct":            coverage_pct,
            "projected_value":         round(projected_value, 0),
            # Instrument recommendation
            "investment_suggestion":   instruments["primary"],
            "secondary_suggestion":    instruments["secondary"],
            "rationale":               instruments["rationale"],
            # CAGR assumptions shown to user for transparency
            "cagr_conservative":       f"{instruments['cagr_conservative']*100:.0f}%",
            "cagr_moderate":           f"{instruments['cagr_moderate']*100:.0f}%",
            "cagr_aggressive":         f"{instruments['cagr_aggressive']*100:.0f}%",
        }

    except Exception as e:
        logger.exception("calculate_goal_plan failed")
        return False, str(e)