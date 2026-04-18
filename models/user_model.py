class UserProfile:
    def __init__(self, data):
        self.age = data.get("age")
        self.income = data.get("income")
        self.expenses = data.get("expenses")
        self.savings = data.get("savings")
        self.risk_appetite = data.get("risk_appetite")
        self.financial_goals = data.get("financial_goals")

    def to_dict(self):
        return {
            "age": self.age,
            "income": self.income,
            "expenses": self.expenses,
            "savings": self.savings,
            "risk_appetite": self.risk_appetite,
            "financial_goals": self.financial_goals
        }