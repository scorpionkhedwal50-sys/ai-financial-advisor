import logging
from flask import Blueprint, request, jsonify
from services.ai_service import chat_with_advisor
from routes.user_routes import get_user_by_id
from database.db import get_connection
from app import limiter

logger  = logging.getLogger(__name__)
chat_bp = Blueprint("chat", __name__)

# ── DB helpers ─────────────────────────────────────────────────────────────

def _load_history(user_id: int, limit: int = 20) -> list:
    """Return the most recent `limit` messages for user_id, oldest first."""
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT role, message FROM chat_history
           WHERE user_id = ?
           ORDER BY id DESC LIMIT ?""",
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    # fetchall gives newest-first; reverse so oldest is first (chronological)
    return [{"role": r["role"], "message": r["message"]} for r in reversed(rows)]


def _save_message(user_id: int, role: str, message: str):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (user_id, role, message) VALUES (?, ?, ?)",
        (user_id, role, message),
    )
    conn.commit()
    conn.close()


def _clear_history(user_id: int):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


# ── Routes ─────────────────────────────────────────────────────────────────

@chat_bp.route("/chat", methods=["POST"])
@limiter.limit("15 per minute")
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
            - user_id
            - query
          properties:
            user_id:
              type: integer
              example: 1
            query:
              type: string
              example: Where should I invest ₹5,000/month?
    responses:
      200:
        description: AI response with updated history
      400:
        description: Missing user_id or query
      404:
        description: User profile not found
      500:
        description: AI error
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    user_id    = data.get("user_id")
    user_query = (data.get("query") or "").strip()

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if not user_query:
        return jsonify({"error": "query is required"}), 400

    profile = get_user_by_id(int(user_id))
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 404

    # Load conversation history from DB
    history = _load_history(user_id, limit=20)

    # Persist the user's message before calling the AI
    _save_message(user_id, "user", user_query)

    status, response_text = chat_with_advisor(profile, user_query, history)
    if not status:
        logger.error("chat: AI error for user %s — %s", user_id, response_text)
        return jsonify({"error": response_text}), 500

    # Persist the AI response
    _save_message(user_id, "ai", response_text)

    return jsonify({
        "query":    user_query,
        "response": response_text,
    })


@chat_bp.route("/chat/history/<int:user_id>", methods=["GET"])
def get_chat_history(user_id):
    """
    Fetch stored chat history for a user.
    ---
    tags:
      - Chat
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: List of chat messages
      404:
        description: User not found
    """
    profile = get_user_by_id(user_id)
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 404

    history = _load_history(user_id, limit=100)
    return jsonify({"user_id": user_id, "history": history})


@chat_bp.route("/chat/history/<int:user_id>", methods=["DELETE"])
def clear_chat_history(user_id):
    """
    Clear all chat history for a user.
    ---
    tags:
      - Chat
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: History cleared
    """
    profile = get_user_by_id(user_id)
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 404

    _clear_history(user_id)
    return jsonify({"message": f"Chat history for user #{user_id} cleared."})