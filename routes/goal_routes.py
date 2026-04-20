import logging
from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from extensions import limiter
from schemas import goal_plan_schema
from services.goal_service import calculate_goal_plan
from routes.user_routes import get_user_by_id

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
        description: Validation error or user not found
      500:
        description: Calculation error
    """
    raw = request.get_json(silent=True)
    if not raw:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    try:
        data = goal_plan_schema.load(raw)
    except ValidationError as exc:
        logger.warning("goal_plan: validation failed — %s", exc.messages)
        return jsonify({"error": "Validation failed", "details": exc.messages}), 400

    user_id = data["user_id"]
    profile = get_user_by_id(user_id)
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 404

    status, result = calculate_goal_plan(profile, data)
    if not status:
        logger.error("goal_plan: calculation failed for user #%d — %s", user_id, result)
        return jsonify({"error": result}), 500

    logger.info(
        "goal_plan: plan calculated for user #%d — target ₹%.0f in %.1f yr(s), feasible=%s",
        user_id, data["target_amount"], data["time_years"], result.get("feasible"),
    )
    return jsonify(result)