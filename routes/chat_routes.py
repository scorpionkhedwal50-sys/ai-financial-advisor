from flask import Blueprint, request, jsonify
from services.ai_service import chat_with_advisor
from routes.user_routes import get_latest_user

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST'])
def chat():
    """
    Chat with AI Financial Advisor
    ---
    tags:
      - Chat
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              example: Where should I invest 5000 per month?
    responses:
      200:
        description: Successful AI response
        schema:
          type: object
          properties:
            query:
              type: string
              example: Where should I invest 5000 per month?
            response:
              type: string
              example: You can invest in SIPs or balanced mutual funds...
      400:
        description: Bad request (missing query or profile)
        schema:
          type: object
          properties:
            error:
              type: string
              example: Query is required
      500:
        description: AI processing error
        schema:
          type: object
          properties:
            error:
              type: string
              example: AI returned empty response
    """

    profile = get_latest_user()

    if not profile:
        return jsonify({"error": "User profile not found"}), 400

    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    user_query = data.get("query")

    if not user_query:
        return jsonify({"error": "Query is required"}), 400

    status, response = chat_with_advisor(profile, user_query)

    if not status:
        return jsonify({"error": response}), 500

    return jsonify({
        "query": user_query,
        "response": response
    })