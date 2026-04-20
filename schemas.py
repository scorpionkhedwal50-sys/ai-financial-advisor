"""
schemas.py — Marshmallow request schemas
=========================================
All incoming JSON bodies are validated here before reaching business logic.
Each schema uses strict typing, sensible bounds, and returns clear error messages.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load


# ── User / Profile ─────────────────────────────────────────────────────────

class ProfileSchema(Schema):
    age = fields.Integer(
        required=True,
        validate=validate.Range(min=1, max=120, error="age must be between 1 and 120"),
        metadata={"description": "Client age in years"},
    )
    income = fields.Float(
        required=True,
        validate=validate.Range(min=0, error="income cannot be negative"),
        metadata={"description": "Monthly gross income in ₹"},
    )
    expenses = fields.Float(
        required=True,
        validate=validate.Range(min=0, error="expenses cannot be negative"),
        metadata={"description": "Monthly total expenses in ₹"},
    )
    savings = fields.Float(
        required=True,
        validate=validate.Range(min=0, error="savings cannot be negative"),
        metadata={"description": "Monthly savings in ₹"},
    )
    risk_appetite = fields.String(
        required=True,
        validate=validate.OneOf(
            ["low", "medium", "high"],
            error="risk_appetite must be one of: low, medium, high",
        ),
        metadata={"description": "Client risk tolerance"},
    )
    financial_goals = fields.String(
        required=True,
        validate=validate.Length(
            min=3, max=500,
            error="financial_goals must be between 3 and 500 characters",
        ),
        metadata={"description": "Free-text description of financial goals"},
    )
    # Optional — used for debt-to-income scoring
    debt_emi = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error="debt_emi cannot be negative"),
        metadata={"description": "Total monthly EMI / debt repayments in ₹ (optional)"},
    )

    @pre_load
    def strip_strings(self, data, **kwargs):
        """Strip whitespace from all string fields before validation."""
        for key in ("risk_appetite", "financial_goals"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip().lower() if key == "risk_appetite" else data[key].strip()
        return data

    @validates("financial_goals")
    def validate_goals_not_whitespace(self, value):
        if not value.strip():
            raise ValidationError("financial_goals must not be blank.")


# ── Report ─────────────────────────────────────────────────────────────────

class GenerateReportSchema(Schema):
    user_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1, error="user_id must be a positive integer"),
        metadata={"description": "ID of the user profile to generate a report for"},
    )


# ── Chat ───────────────────────────────────────────────────────────────────

class ChatSchema(Schema):
    user_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1, error="user_id must be a positive integer"),
    )
    query = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=2000,
            error="query must be between 1 and 2000 characters",
        ),
        metadata={"description": "The user's question for the AI advisor"},
    )

    @pre_load
    def strip_query(self, data, **kwargs):
        if isinstance(data.get("query"), str):
            data["query"] = data["query"].strip()
        return data

    @validates("query")
    def validate_query_not_blank(self, value):
        if not value.strip():
            raise ValidationError("query must not be blank.")


# ── Goal Planner ───────────────────────────────────────────────────────────

class GoalPlanSchema(Schema):
    user_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1, error="user_id must be a positive integer"),
    )
    target_amount = fields.Float(
        required=True,
        validate=validate.Range(
            min=1, error="target_amount must be greater than 0"
        ),
        metadata={"description": "Goal amount in ₹"},
    )
    time_years = fields.Float(
        required=True,
        validate=validate.Range(
            min=0.5, error="time_years must be at least 0.5 (6 months)"
        ),
        metadata={"description": "Time horizon in years"},
    )


# ── Singleton instances (import and reuse these) ───────────────────────────

profile_schema        = ProfileSchema()
generate_report_schema = GenerateReportSchema()
chat_schema           = ChatSchema()
goal_plan_schema      = GoalPlanSchema()