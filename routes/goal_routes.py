import logging
from flask import Blueprint, request, jsonify
from services.goal_service import calculate_goal_plan
from routes.user_routes import get_user_by_id
from app import limiter

logger  = logging.getLogger(__name__)
goal_bp = Blueprint("goal", __name__)


@goal_bp.route("/goal-plan", methods=["POST"])
@limiter.limit("20 per minute")
def goal_plan():
    """
    Goal Planning API — SIP calculator with compound returns
    ---
    tags:
      - Goal
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - user_id
            - target_amount
            - time_years
          properties:
            user_id:
              type: integer
              example: 1
            target_amount:
              type: number
              example: 500000
            time_years:
              type: number
              example: 3
    responses:
      200:
        description: Goal plan with SIP amounts at 3 CAGR scenarios
      400:
        description: Missing or invalid fields
      404:
        description: User profile not found
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    profile = get_user_by_id(int(user_id))
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 404

    if "target_amount" not in data or "time_years" not in data:
        return jsonify({"error": "target_amount and time_years are required"}), 400

    try:
        target = float(data["target_amount"])
        years  = float(data["time_years"])
    except (ValueError, TypeError):
        return jsonify({"error": "target_amount and time_years must be numbers"}), 400

    if target <= 0:
        return jsonify({"error": "target_amount must be greater than 0"}), 400
    if years <= 0:
        return jsonify({"error": "time_years must be greater than 0"}), 400

    status, result = calculate_goal_plan(profile, data)
    if not status:
        logger.error("goal_plan: calculation failed for user %s — %s", user_id, result)
        return jsonify({"error": result}), 500

    return jsonify(result)