import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def generate_pdf_report(profile, health_data, ai_report, filename="financial_report.pdf"):
    try:
        # ✅ Absolute path (VERY IMPORTANT)
        file_path = os.path.join(os.getcwd(), filename)

        doc = SimpleDocTemplate(file_path)
        styles = getSampleStyleSheet()

        content = []

        # Title
        content.append(Paragraph("AI Financial Advisory Report", styles['Title']))
        content.append(Spacer(1, 12))

        # Health Score
        content.append(Paragraph("Financial Health Score", styles['Heading2']))
        content.append(Paragraph(f"{health_data['score']}/100", styles['Normal']))
        content.append(Spacer(1, 10))

        # Insights
        content.append(Paragraph("Insights", styles['Heading3']))
        for i in health_data.get('insights', []):
            content.append(Paragraph(f"- {i}", styles['Normal']))
        content.append(Spacer(1, 10))

        # Warnings
        content.append(Paragraph("Warnings", styles['Heading3']))
        for w in health_data.get('warnings', []):
            content.append(Paragraph(f"- {w}", styles['Normal']))
        content.append(Spacer(1, 10))

        # AI Report (SAFE HANDLING)
        content.append(Paragraph("AI Financial Advice", styles['Heading2']))

        # 🔥 Split long text into lines (IMPORTANT FIX)
        if ai_report:
            lines = ai_report.split("\n")
            for line in lines:
                if line.strip():
                    content.append(Paragraph(line.strip(), styles['Normal']))
                    content.append(Spacer(1, 6))
        else:
            content.append(Paragraph("No AI report generated.", styles['Normal']))

        # Build PDF
        doc.build(content)

        print(f"PDF generated at: {file_path}")  # DEBUG

        return True, file_path

    except Exception as e:
        print("PDF ERROR:", str(e))  # DEBUG
        return False, str(e)