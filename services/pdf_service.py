import os
from datetime import datetime
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


# ── Colour palette ──────────────────────────────────────────────────────────
DARK       = colors.HexColor("#0d1117")
DARK2      = colors.HexColor("#161b22")
ACCENT     = colors.HexColor("#e9a83c")
ACCENT_DIM = colors.HexColor("#3a2e12")
GREEN      = colors.HexColor("#34d399")
GREEN_DIM  = colors.HexColor("#0d2b20")
RED        = colors.HexColor("#f87171")
RED_DIM    = colors.HexColor("#2b0d0d")
YELLOW     = colors.HexColor("#fbbf24")
YELLOW_DIM = colors.HexColor("#2b2208")
MUTED      = colors.HexColor("#7e8899")
FAINT      = colors.HexColor("#3a4252")
WHITE      = colors.HexColor("#eef0f4")
PAGE_BG    = colors.HexColor("#0d1117")


def make_styles():
    base = getSampleStyleSheet()

    styles = {
        "doc_title": ParagraphStyle(
            "doc_title",
            fontName="Helvetica-Bold",
            fontSize=26,
            textColor=WHITE,
            leading=32,
            spaceAfter=4,
        ),
        "doc_subtitle": ParagraphStyle(
            "doc_subtitle",
            fontName="Helvetica",
            fontSize=12,
            textColor=MUTED,
            leading=16,
            spaceAfter=0,
        ),
        "section_heading": ParagraphStyle(
            "section_heading",
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=ACCENT,
            leading=18,
            spaceBefore=18,
            spaceAfter=6,
        ),
        "sub_heading": ParagraphStyle(
            "sub_heading",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=MUTED,
            leading=14,
            spaceBefore=10,
            spaceAfter=4,
            letterSpacing=0.8,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=10,
            textColor=WHITE,
            leading=15,
            spaceAfter=6,
        ),
        "body_muted": ParagraphStyle(
            "body_muted",
            fontName="Helvetica",
            fontSize=10,
            textColor=MUTED,
            leading=15,
            spaceAfter=4,
        ),
        "score_big": ParagraphStyle(
            "score_big",
            fontName="Helvetica-Bold",
            fontSize=42,
            textColor=WHITE,
            leading=48,
            alignment=TA_CENTER,
        ),
        "score_label": ParagraphStyle(
            "score_label",
            fontName="Helvetica",
            fontSize=11,
            textColor=MUTED,
            leading=14,
            alignment=TA_CENTER,
        ),
        "insight_text": ParagraphStyle(
            "insight_text",
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#a7f3d0"),
            leading=15,
        ),
        "warning_text": ParagraphStyle(
            "warning_text",
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#fde68a"),
            leading=15,
        ),
        "ai_section_head": ParagraphStyle(
            "ai_section_head",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=ACCENT,
            leading=16,
            spaceBefore=10,
            spaceAfter=3,
        ),
        "ai_body": ParagraphStyle(
            "ai_body",
            fontName="Helvetica",
            fontSize=10,
            textColor=MUTED,
            leading=15,
            spaceAfter=4,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Helvetica",
            fontSize=8,
            textColor=FAINT,
            leading=12,
            alignment=TA_CENTER,
        ),
        "label_small": ParagraphStyle(
            "label_small",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=MUTED,
            leading=11,
            letterSpacing=0.5,
        ),
        "value_large": ParagraphStyle(
            "value_large",
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=WHITE,
            leading=20,
        ),
        "tag": ParagraphStyle(
            "tag",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=ACCENT,
            leading=11,
            alignment=TA_CENTER,
        ),
    }
    return styles


def header_footer(canvas, doc):
    """Draw page background, header bar, and footer on every page."""
    canvas.saveState()
    w, h = A4

    # Full page dark background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Header accent strip
    canvas.setFillColor(ACCENT_DIM)
    canvas.rect(0, h - 14*mm, w, 14*mm, fill=1, stroke=0)

    canvas.setFillColor(ACCENT)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(18*mm, h - 9*mm, "FinanceAI  ·  Personalised Financial Report")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(w - 18*mm, h - 9*mm, f"Page {doc.page}")

    # Footer line
    canvas.setStrokeColor(FAINT)
    canvas.setLineWidth(0.5)
    canvas.line(18*mm, 12*mm, w - 18*mm, 12*mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(FAINT)
    canvas.drawCentredString(w / 2, 7*mm, "This report is AI-generated. Always consult a registered financial advisor before making investment decisions.")

    canvas.restoreState()


def score_color(score):
    if score >= 70: return GREEN, GREEN_DIM, colors.HexColor("#a7f3d0")
    if score >= 50: return YELLOW, YELLOW_DIM, colors.HexColor("#fde68a")
    return RED, RED_DIM, colors.HexColor("#fca5a5")


def fmt_inr(val):
    try:
        return f"\u20b9{float(val):,.0f}"
    except Exception:
        return str(val)


def build_score_block(score, styles):
    col, dim, text_col = score_color(score)
    label = "Healthy" if score >= 70 else "Moderate" if score >= 50 else "At Risk"

    score_label_style = ParagraphStyle(
        "score_label_col", parent=styles["score_label"], textColor=col
    )
    score_big_style = ParagraphStyle(
        "score_big_col", parent=styles["score_big"], textColor=col
    )

    inner = [
        [
            Paragraph(str(score), score_big_style),
            Paragraph("/ 100", styles["score_label"]),
            Paragraph(label, score_label_style),
        ]
    ]
    inner_t = Table(inner, colWidths=[55*mm, 20*mm, 40*mm])
    inner_t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "RIGHT"),
        ("ALIGN", (1, 0), (1, 0), "LEFT"),
        ("ALIGN", (2, 0), (2, 0), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))

    wrapper = Table([[inner_t]], colWidths=[175*mm])
    wrapper.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), dim),
        ("ROUNDEDCORNERS", [8]),
        ("BOX", (0, 0), (0, 0), 1, col),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return wrapper


def build_metrics_table(profile, styles):
    income = float(profile.get("income", 0))
    expenses = float(profile.get("expenses", 0))
    savings = float(profile.get("savings", 0))
    sav_rate = round((savings / income) * 100) if income > 0 else 0
    exp_rate = round((expenses / income) * 100) if income > 0 else 0

    def cell(label, value, sub="", val_color=WHITE):
        val_style = ParagraphStyle("vs", parent=styles["value_large"], textColor=val_color)
        return [
            Paragraph(label.upper(), styles["label_small"]),
            Paragraph(value, val_style),
            Paragraph(sub, styles["body_muted"]) if sub else Spacer(1, 4),
        ]

    data = [[
        cell("Monthly income", fmt_inr(income)),
        cell("Monthly expenses", fmt_inr(expenses), f"{exp_rate}% of income", RED),
        cell("Monthly savings", fmt_inr(savings), f"{sav_rate}% savings rate", GREEN),
        cell("Risk appetite", (profile.get("risk_appetite") or "—").capitalize()),
    ]]

    col_w = [42*mm] * 4
    t = Table(data, colWidths=col_w, rowHeights=None)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK2),
        ("ROUNDEDCORNERS", [6]),
        ("BOX", (0, 0), (-1, -1), 0.5, FAINT),
        ("LINEAFTER", (0, 0), (2, 0), 0.5, FAINT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def build_insights_warnings(health_data, styles):
    insights = health_data.get("insights", [])
    warnings = health_data.get("warnings", [])
    story = []

    if insights:
        story.append(Paragraph("STRENGTHS", styles["sub_heading"]))
        rows = [[
            Paragraph("✓", ParagraphStyle("chk", fontName="Helvetica-Bold", fontSize=11, textColor=GREEN, leading=15)),
            Paragraph(ins, styles["insight_text"]),
        ] for ins in insights]
        t = Table(rows, colWidths=[8*mm, 157*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN_DIM),
            ("ROUNDEDCORNERS", [6]),
            ("BOX", (0, 0), (-1, -1), 0.5, GREEN),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#1a4a35")),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    if warnings:
        story.append(Paragraph("AREAS TO IMPROVE", styles["sub_heading"]))
        rows = [[
            Paragraph("!", ParagraphStyle("wrn", fontName="Helvetica-Bold", fontSize=11, textColor=YELLOW, leading=15)),
            Paragraph(w, styles["warning_text"]),
        ] for w in warnings]
        t = Table(rows, colWidths=[8*mm, 157*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), YELLOW_DIM),
            ("ROUNDEDCORNERS", [6]),
            ("BOX", (0, 0), (-1, -1), 0.5, YELLOW),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#4a3a08")),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    return story


def build_ai_section(ai_report, styles):
    story = []
    if not ai_report:
        story.append(Paragraph("No AI report generated.", styles["body_muted"]))
        return story

    sections = []
    current = []
    for line in ai_report.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        # Detect numbered section headings like "1. Summary"
        if len(stripped) < 80 and (stripped[0].isdigit() and stripped[1:3] in [". ", ") "]):
            if current:
                sections.append(current)
            current = [stripped]
        else:
            current.append(stripped)
    if current:
        sections.append(current)

    if not sections:
        # fallback: render as plain paragraphs
        for line in ai_report.split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), styles["ai_body"]))
        return story

    for sec in sections:
        heading = sec[0]
        body_lines = sec[1:]

        # Heading row with left accent bar via table
        h_row = [[
            Table([[""]], colWidths=[2*mm], rowHeights=[None]),
            Paragraph(heading, styles["ai_section_head"]),
        ]]
        h_t = Table(h_row, colWidths=[4*mm, 161*mm])
        h_t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), ACCENT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(h_t)

        for bl in body_lines:
            story.append(Paragraph(bl, styles["ai_body"]))
        story.append(Spacer(1, 8))

    return story


def generate_pdf_report(profile, health_data, ai_report, filename="financial_report.pdf"):
    try:
        file_path = os.path.join(os.getcwd(), filename)
        styles = make_styles()

        doc = SimpleDocTemplate(
            file_path,
            pagesize=A4,
            topMargin=22*mm,
            bottomMargin=20*mm,
            leftMargin=18*mm,
            rightMargin=18*mm,
        )

        story = []
        now = datetime.now().strftime("%d %B %Y, %I:%M %p")

        # ── COVER HEADER ──────────────────────────────────────────────────
        story.append(Spacer(1, 8*mm))
        story.append(Paragraph("AI Financial Advisory Report", styles["doc_title"]))
        story.append(Paragraph(f"Generated on {now}", styles["doc_subtitle"]))
        story.append(Spacer(1, 2*mm))

        # Profile tag
        goal = profile.get("financial_goals") or "No goal specified"
        risk = (profile.get("risk_appetite") or "—").capitalize()
        age = profile.get("age", "—")
        story.append(Paragraph(
            f"Goal: {goal}   ·   Risk appetite: {risk}   ·   Age: {age}",
            styles["body_muted"]
        ))
        story.append(Spacer(1, 6*mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=FAINT))
        story.append(Spacer(1, 6*mm))

        # ── SECTION 1: Financial snapshot ─────────────────────────────────
        story.append(KeepTogether([
            Paragraph("01  Financial Snapshot", styles["section_heading"]),
            build_metrics_table(profile, styles),
        ]))
        story.append(Spacer(1, 6*mm))

        # ── SECTION 2: Health score ────────────────────────────────────────
        story.append(Paragraph("02  Financial Health Score", styles["section_heading"]))
        story.append(build_score_block(health_data.get("score", 0), styles))
        story.append(Spacer(1, 6*mm))

        # ── SECTION 3: Insights & warnings ────────────────────────────────
        story.append(Paragraph("03  Insights & Areas to Improve", styles["section_heading"]))
        story.extend(build_insights_warnings(health_data, styles))
        story.append(Spacer(1, 4*mm))

        # ── SECTION 4: AI advice ──────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=0.5, color=FAINT))
        story.append(Paragraph("04  Personalised AI Advice", styles["section_heading"]))
        story.extend(build_ai_section(ai_report, styles))
        story.append(Spacer(1, 6*mm))

        # ── SECTION 5: Disclaimer ─────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=0.5, color=FAINT))
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(
            "Disclaimer",
            ParagraphStyle("disc_head", fontName="Helvetica-Bold", fontSize=9, textColor=FAINT, leading=13)
        ))
        story.append(Paragraph(
            "This report is generated by an AI system using the financial data you provided. "
            "It is intended for informational purposes only and does not constitute professional financial, "
            "investment, or legal advice. Past performance is not indicative of future results. "
            "Please consult a SEBI-registered financial advisor before making any investment decisions.",
            ParagraphStyle("disc_body", fontName="Helvetica", fontSize=8, textColor=FAINT, leading=12, spaceAfter=4)
        ))

        # Build PDF with custom page template
        doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)

        print(f"[PDF] Generated at: {file_path}")
        return True, file_path

    except Exception as e:
        print(f"[PDF ERROR] {e}")
        return False, str(e)