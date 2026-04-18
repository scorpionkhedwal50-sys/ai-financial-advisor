from flask import Blueprint, request, jsonify
from services.profiling_service import create_user_profile
from database.db import get_connection

user_bp = Blueprint('user', __name__)


# 🔹 Helper: Get latest user (used by other routes)
def get_latest_user():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users ORDER BY id DESC LIMIT 1")
    user = cursor.fetchone()

    conn.close()

    if not user:
        return None

    return dict(user)


@user_bp.route('/profile', methods=['POST'])
def create_profile():
    """
    Create User Profile
    ---
    tags:
      - User
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            age:
              type: integer
              example: 23
            income:
              type: number
              example: 40000
            expenses:
              type: number
              example: 25000
            savings:
              type: number
              example: 15000
            risk_appetite:
              type: string
              example: medium
            financial_goals:
              type: string
              example: Buy a car
    responses:
      200:
        description: Profile created successfully
      400:
        description: Invalid input
    """
    data = request.get_json()

    # Step 1: Validate + normalize
    status, result = create_user_profile(data)

    if not status:
        return jsonify({"error": result}), 400

    # Step 2: Save to DB
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO users (age, income, expenses, savings, risk_appetite, financial_goals)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        result["age"],
        result["income"],
        result["expenses"],
        result["savings"],
        result["risk_appetite"],
        result["financial_goals"]
    ))

    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "message": "Profile saved successfully",
        "user_id": user_id,
        "profile": result
    })