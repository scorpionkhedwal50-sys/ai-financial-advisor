import io
import json
import logging
import os
import tempfile

from flask import Blueprint, jsonify, send_file, request
from services.health_service import calculate_health_score
from services.ai_service import generate_financial_report
from services.pdf_service import generate_pdf_report
from routes.user_routes import get_user_by_id
from database.db import get_connection
from app import limiter

logger    = logging.getLogger(__name__)
report_bp = Blueprint("report", __name__)


# ── DB helpers ─────────────────────────────────────────────────────────────

def _save_report_to_db(user_id: int, health_data: dict,
                       ai_report: str, pdf_bytes: bytes):
    """Upsert a report row. Accepts raw PDF bytes — no filesystem dependency."""
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO reports (user_id, health_json, ai_report, pdf_blob, generated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            health_json  = excluded.health_json,
            ai_report    = excluded.ai_report,
            pdf_blob     = excluded.pdf_blob,
            generated_at = CURRENT_TIMESTAMP
        """,
        (user_id, json.dumps(health_data), ai_report, pdf_bytes),
    )
    conn.commit()
    conn.close()


def _load_report_from_db(user_id: int):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT health_json, ai_report FROM reports WHERE user_id = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {"health": json.loads(row["health_json"]), "ai_report": row["ai_report"]}


def _load_pdf_blob_from_db(user_id: int):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT pdf_blob FROM reports WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return bytes(row["pdf_blob"]) if row else None


# ── Routes ─────────────────────────────────────────────────────────────────

@report_bp.route("/report/<int:user_id>", methods=["GET"])
def get_stored_report(user_id):
    """
    Fetch a previously generated report.
    ---
    tags:
      - Report
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: Stored report
      404:
        description: No report found
    """
    data = _load_report_from_db(user_id)
    if not data:
        return jsonify({"error": "No report found for this user"}), 404
    return jsonify(data)


@report_bp.route("/generate-report", methods=["POST"])
@limiter.limit("5 per minute")
def generate_report():
    """
    Generate (or regenerate) a financial report.
    ---
    tags:
      - Report
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - user_id
          properties:
            user_id:
              type: integer
              example: 1
    responses:
      200:
        description: Report generated
      400:
        description: User not found
      500:
        description: Generation error
    """
    body    = request.get_json(silent=True) or {}
    user_id = body.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    profile = get_user_by_id(int(user_id))
    if not profile:
        return jsonify({"error": f"User profile #{user_id} not found"}), 400

    # 1. Health score
    health_data = calculate_health_score(profile)

    # 2. AI report text
    status, ai_report = generate_financial_report(profile, health_data)
    if not status:
        return jsonify({"error": ai_report}), 500

    # 3. Generate PDF into a secure temp file, read bytes, then delete immediately
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = tmp.name

        status, result = generate_pdf_report(
            profile, health_data, ai_report, filename=tmp_path
        )
        if not status:
            return jsonify({"error": result}), 500

        with open(tmp_path, "rb") as f:
            pdf_bytes = f.read()

    finally:
        # Always clean up the temp file — even if an exception occurred above
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                logger.debug("Deleted temp PDF: %s", tmp_path)
        except Exception as cleanup_err:
            logger.warning("Could not delete temp PDF %s: %s", tmp_path, cleanup_err)

    # 4. Persist to DB
    try:
        _save_report_to_db(user_id, health_data, ai_report, pdf_bytes)
    except Exception as e:
        logger.exception("Failed to save report to DB for user %s", user_id)
        return jsonify({"error": f"DB save failed: {e}"}), 500

    return jsonify({
        "user_id":   user_id,
        "health":    health_data,
        "ai_report": ai_report,
    })


@report_bp.route("/download-report/<int:user_id>", methods=["GET"])
def download_report(user_id):
    """
    Download the stored PDF directly from the database.
    ---
    tags:
      - Report
    parameters:
      - name: user_id
        in: path
        required: true
        type: integer
    responses:
      200:
        description: PDF download
      404:
        description: No report found
    """
    pdf_bytes = _load_pdf_blob_from_db(user_id)
    if not pdf_bytes:
        return jsonify({"error": "No report found. Generate one first."}), 404

    return send_file(
        io.BytesIO(pdf_bytes),
        as_attachment=True,
        download_name=f"financial_report_profile_{user_id}.pdf",
        mimetype="application/pdf",
    )