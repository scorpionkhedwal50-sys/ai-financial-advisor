def calculate_goal_plan(profile, goal_data):
    try:
        target_amount = float(goal_data.get("target_amount"))
        time_years = float(goal_data.get("time_years"))

        monthly_savings = profile["savings"]

        months = time_years * 12
        required_monthly_saving = target_amount / months

        result = {
            "target_amount": target_amount,
            "time_years": time_years,
            "required_monthly_saving": round(required_monthly_saving, 2),
            "current_monthly_saving": monthly_savings
        }

        if monthly_savings >= required_monthly_saving:
            result["feasible"] = True
            result["message"] = "Goal is achievable."
        else:
            gap = required_monthly_saving - monthly_savings
            result["feasible"] = False
            result["message"] = f"Save ₹{round(gap,2)} more per month."

        risk = profile["risk_appetite"]

        if risk == "low":
            suggestion = "FDs and low-risk funds."
        elif risk == "medium":
            suggestion = "Balanced mutual funds."
        else:
            suggestion = "Equity SIPs."

        result["investment_suggestion"] = suggestion

        return True, result

    except Exception as e:
        return False, str(e)