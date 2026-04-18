from flask import Blueprint, jsonify, send_file
from services.health_service import calculate_health_score
from services.ai_service import generate_financial_report
from services.pdf_service import generate_pdf_report
from routes.user_routes import get_latest_user
import os

report_bp = Blueprint('report', __name__)

REPORT_CACHE = {}


@report_bp.route('/generate-report', methods=['POST'])
def generate_report():
    """
    Generate Financial Report
    ---
    tags:
      - Report
    responses:
      200:
        description: Financial report generated
    """

    # Fetch latest user from DB
    profile = get_latest_user()

    if not profile:
        return jsonify({"error": "User profile not found"}), 400

    # Health score
    health_data = calculate_health_score(profile)

    # AI report
    status, ai_report = generate_financial_report(profile, health_data)
    if not status:
        return jsonify({"error": ai_report}), 500

    # Generate PDF
    status, pdf_file = generate_pdf_report(profile, health_data, ai_report)
    if not status:
        return jsonify({"error": pdf_file}), 500

    # Store file path
    REPORT_CACHE["file"] = pdf_file

    return jsonify({
        "health": health_data,
        "ai_report": ai_report,
        "pdf_file": pdf_file
    })


@report_bp.route('/download-report', methods=['GET'])
def download_report():
    """
    Download PDF
    ---
    tags:
      - Report
    """

    if "file" not in REPORT_CACHE:
        return jsonify({"error": "No report available"}), 400

    # Convert to absolute path
    file_path = os.path.abspath(REPORT_CACHE["file"])

    print("DOWNLOAD PATH:", file_path)  # Debug log

    # Check if file exists
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(
        file_path,
        as_attachment=True,
        download_name="financial_report.pdf",
        mimetype="application/pdf"
    )