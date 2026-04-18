from models.user_model import UserProfile


def validate_user_input(data):
    required_fields = [
        "age",
        "income",
        "expenses",
        "savings",
        "risk_appetite",
        "financial_goals"
    ]

    for field in required_fields:
        if field not in data or data[field] is None:
            return False, f"Missing field: {field}"

    return True, "Valid input"


def normalize_data(data):
    try:
        data["age"] = int(data["age"])
        data["income"] = float(data["income"])
        data["expenses"] = float(data["expenses"])
        data["savings"] = float(data["savings"])
        data["risk_appetite"] = data["risk_appetite"].lower()
    except Exception as e:
        return False, str(e)

    return True, data


def create_user_profile(data):
    is_valid, message = validate_user_input(data)
    if not is_valid:
        return False, message

    is_normalized, normalized_data = normalize_data(data)
    if not is_normalized:
        return False, normalized_data

    user = UserProfile(normalized_data)

    return True, user.to_dict()