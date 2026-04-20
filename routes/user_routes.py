from flask import Blueprint, request, jsonify
from services.profiling_service import create_user_profile
from database.db import get_connection

user_bp = Blueprint('user', __name__)


# ── helpers (imported by other route modules) ──────────────────────────────

def get_latest_user():
    """Return the most recently created user as a plain dict, or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users ORDER BY id DESC LIMIT 1")
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None


def get_user_by_id(user_id: int):
    """Return a specific user as a plain dict, or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None


def get_all_users():
    """Return all users ordered by id ascending."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── routes ─────────────────────────────────────────────────────────────────

@user_bp.route('/users', methods=['GET'])
def list_users():
    """
    List all saved user profiles.
    ---
    tags:
      - User
    responses:
      200:
        description: List of user profiles
    """
    users = get_all_users()
    return jsonify({"users": users})


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
              example: Buy a car in 2 years
    responses:
      200:
        description: Profile created successfully
      400:
        description: Invalid input
    """
    data = request.get_json()

    status, result = create_user_profile(data)
    if not status:
        return jsonify({"error": result}), 400

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
        result["financial_goals"],
    ))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "message": "Profile saved successfully",
        "user_id": user_id,
        "profile": result,
    })


@user_bp.route('/profile/<int:user_id>', methods=['DELETE'])
def delete_profile(user_id):
    """
    Delete a user profile and their associated report.
    Both the users row and the reports row (if any) are removed atomically.
    ---
    tags:
      - User
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: Profile deleted successfully
      404:
        description: Profile not found
      500:
        description: Deletion failed
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Check the user exists first
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Profile not found"}), 404

    try:
        # Delete the report first (foreign key child), then the user (parent)
        cursor.execute("DELETE FROM reports WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM users   WHERE id      = ?", (user_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"Deletion failed: {e}"}), 500

    conn.close()

    # Also remove the on-disk PDF if it still exists
    import os
    pdf_path = os.path.join(os.getcwd(), f"financial_report_user_{user_id}.pdf")
    try:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    except Exception:
        pass   # non-fatal — DB is already clean

    return jsonify({
        "message": f"Profile #{user_id} deleted successfully",
        "deleted_user_id": user_id,
    })