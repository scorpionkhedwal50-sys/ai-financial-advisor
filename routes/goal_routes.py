from flask import Blueprint, request, jsonify
from services.goal_service import calculate_goal_plan
from routes.user_routes import get_latest_user

goal_bp = Blueprint('goal', __name__)


@goal_bp.route('/goal-plan', methods=['POST'])
def goal_plan():
    """
    Goal Planning API
    ---
    tags:
      - Goal
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            target_amount:
              type: number
              example: 500000
            time_years:
              type: number
              example: 2
    """

    profile = get_latest_user()

    if not profile:
        return jsonify({"error": "User profile not found"}), 400

    data = request.get_json()

    if "target_amount" not in data or "time_years" not in data:
        return jsonify({"error": "target_amount and time_years are required"}), 400

    status, result = calculate_goal_plan(profile, data)

    if not status:
        return jsonify({"error": result}), 500

    return jsonify(result)