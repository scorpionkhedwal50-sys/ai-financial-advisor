import io
import json

from flask import Blueprint, jsonify, send_file, request
from services.health_service import calculate_health_score
from services.ai_service import generate_financial_report
from services.pdf_service import generate_pdf_report
from routes.user_routes import get_latest_user, get_user_by_id
from database.db import get_connection

report_bp = Blueprint('report', __name__)


# ── helpers ────────────────────────────────────────────────────────────────

def _save_report_to_db(user_id: int, health_data: dict,
                       ai_report: str, pdf_path: str):
    """
    Upsert a report row for user_id.
    Reads the PDF file from disk into a blob, then stores everything in the DB.
    After this call the on-disk PDF file is no longer needed.
    """
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (user_id, health_json, ai_report, pdf_blob, generated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            health_json  = excluded.health_json,
            ai_report    = excluded.ai_report,
            pdf_blob     = excluded.pdf_blob,
            generated_at = CURRENT_TIMESTAMP
    """, (
        user_id,
        json.dumps(health_data),
        ai_report,
        pdf_bytes,
    ))
    conn.commit()
    conn.close()


def _load_report_from_db(user_id: int):
    """
    Return the stored report dict for user_id, or None if not found.
    Dict shape: { health, ai_report }  (no pdf_blob exposed to caller)
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT health_json, ai_report FROM reports WHERE user_id = ?",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "health":    json.loads(row["health_json"]),
        "ai_report": row["ai_report"],
    }


def _load_pdf_blob_from_db(user_id: int):
    """Return raw PDF bytes for user_id, or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT pdf_blob FROM reports WHERE user_id = ?",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return bytes(row["pdf_blob"]) if row else None


# ── routes ─────────────────────────────────────────────────────────────────

@report_bp.route('/report/<int:user_id>', methods=['GET'])
def get_stored_report(user_id):
    """
    Fetch a previously generated report from the database.
    Used by the frontend when switching profiles — avoids needing to
    regenerate the report each time.

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
        description: Stored report found
      404:
        description: No report for this user yet
    """
    data = _load_report_from_db(user_id)
    if not data:
        return jsonify({"error": "No report found for this user"}), 404
    return jsonify(data)


@report_bp.route('/generate-report', methods=['POST'])
def generate_report():
    """
    Generate (or regenerate) a financial report for the latest user.
    The result is stored in the database — the old report is replaced.

    ---
    tags:
      - Report
    responses:
      200:
        description: Report generated and saved
      400:
        description: User profile not found
      500:
        description: Generation or PDF error
    """
    # Determine which user to generate for.
    # Prefer explicit user_id in the JSON body; fall back to latest DB user.
    body = request.get_json(silent=True) or {}
    user_id_param = body.get("user_id")

    if user_id_param:
        profile = get_user_by_id(int(user_id_param))
    else:
        profile = get_latest_user()

    if not profile:
        return jsonify({"error": "User profile not found"}), 400

    user_id = profile["id"]

    # 1. Health score (rule-based, fast)
    health_data = calculate_health_score(profile)

    # 2. AI report text
    status, ai_report = generate_financial_report(profile, health_data)
    if not status:
        return jsonify({"error": ai_report}), 500

    # 3. Generate PDF to a temp file, then read into DB
    pdf_filename = f"financial_report_user_{user_id}.pdf"
    status, pdf_path = generate_pdf_report(profile, health_data, ai_report,
                                           filename=pdf_filename)
    if not status:
        return jsonify({"error": pdf_path}), 500

    # 4. Persist everything in the database (upsert)
    try:
        _save_report_to_db(user_id, health_data, ai_report, pdf_path)
    except Exception as e:
        return jsonify({"error": f"DB save failed: {e}"}), 500

    return jsonify({
        "user_id":   user_id,
        "health":    health_data,
        "ai_report": ai_report,
    })


@report_bp.route('/download-report/<int:user_id>', methods=['GET'])
def download_report(user_id):
    """
    Download the stored PDF for a specific user directly from the database.
    No filesystem dependency.

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
        description: PDF file download
      404:
        description: No report found for this user
    """
    pdf_bytes = _load_pdf_blob_from_db(user_id)
    if not pdf_bytes:
        return jsonify({"error": "No report found. Please generate one first."}), 404

    return send_file(
        io.BytesIO(pdf_bytes),
        as_attachment=True,
        download_name=f"financial_report_profile_{user_id}.pdf",
        mimetype="application/pdf",
    )