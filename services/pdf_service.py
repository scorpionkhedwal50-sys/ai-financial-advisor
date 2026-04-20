"""
pdf_service.py  —  Gemini markdown → dark-themed PDF via ReportLab
Crash fix: padding is now set per-column so the narrow indent spacer
column never receives left/right padding that makes its effective width negative.
"""

import os
import re
from datetime import datetime

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Preformatted,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ── Palette ────────────────────────────────────────────────────────────────
C = {
    "bg0":        colors.HexColor("#0c0e12"),
    "bg1":        colors.HexColor("#111318"),
    "bg2":        colors.HexColor("#181c22"),
    "bg3":        colors.HexColor("#1f2430"),
    "bg4":        colors.HexColor("#252b38"),
    "accent":     colors.HexColor("#e9a83c"),
    "accent_dim": colors.HexColor("#2e2208"),
    "accent_bdr": colors.HexColor("#5a4010"),
    "green":      colors.HexColor("#34d399"),
    "green_dim":  colors.HexColor("#0a2419"),
    "green_bdr":  colors.HexColor("#1a4a30"),
    "green_txt":  colors.HexColor("#a7f3d0"),
    "red":        colors.HexColor("#f87171"),
    "yellow":     colors.HexColor("#fbbf24"),
    "yellow_dim": colors.HexColor("#2a1e08"),
    "yellow_bdr": colors.HexColor("#4a3808"),
    "yellow_txt": colors.HexColor("#fde68a"),
    "blue_dim":   colors.HexColor("#0d1e38"),
    "blue_bdr":   colors.HexColor("#1e3a5f"),
    "blue_txt":   colors.HexColor("#93c5fd"),
    "code_bg":    colors.HexColor("#161b25"),
    "code_txt":   colors.HexColor("#e2c97e"),
    "white":      colors.HexColor("#eef0f4"),
    "muted":      colors.HexColor("#7e8899"),
    "faint":      colors.HexColor("#3a4252"),
    "faint2":     colors.HexColor("#252a35"),
    "tbl_head":   colors.HexColor("#1e2535"),
    "tbl_alt":    colors.HexColor("#191e29"),
}

# ── Layout ─────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_M = RIGHT_M = 18 * mm
TOP_M  = BOT_M   = 20 * mm
CW     = PAGE_W - LEFT_M - RIGHT_M   # ≈ 493 pt  (usable content width)

# List geometry — keep indent small so text column stays wide
INDENT   = 10    # pt per nesting level (reduced from 14 to stay safe)
MARKER_W = 16    # pt — bullet / number column
# Minimum text column width guard
MIN_TEXT_W = 80  # pt

# ── Style counter (unique names across repeated calls) ─────────────────────
_sc = [0]
def _st(**kw):
    _sc[0] += 1
    d = dict(fontName="Helvetica", fontSize=10, textColor=C["white"],
             leading=15, alignment=TA_LEFT)
    d.update(kw)
    return ParagraphStyle(f"_dyn_{_sc[0]}", **d)

# ── Static styles (defined once at import) ─────────────────────────────────
def _ss(name, **kw):
    d = dict(fontName="Helvetica", fontSize=10, textColor=C["white"],
             leading=15, alignment=TA_LEFT)
    d.update(kw)
    return ParagraphStyle(name, **d)

ST = {
    "doc_title":  _ss("p_doc_title",  fontName="Helvetica-Bold", fontSize=22, textColor=C["white"],    leading=28),
    "doc_sub":    _ss("p_doc_sub",    fontSize=11,  textColor=C["muted"],    leading=16),
    "doc_meta":   _ss("p_doc_meta",   fontSize=9,   textColor=C["faint"],    leading=13),
    "sec_num":    _ss("p_sec_num",    fontName="Helvetica-Bold", fontSize=11, textColor=C["accent"],   leading=16, spaceBefore=14, spaceAfter=4),
    "h1":         _ss("p_h1",         fontName="Helvetica-Bold", fontSize=16, textColor=C["white"],    leading=22, spaceBefore=14, spaceAfter=5),
    "h2":         _ss("p_h2",         fontName="Helvetica-Bold", fontSize=13, textColor=C["accent"],   leading=19, spaceBefore=11, spaceAfter=4),
    "h3":         _ss("p_h3",         fontName="Helvetica-Bold", fontSize=11, textColor=C["white"],    leading=16, spaceBefore=9,  spaceAfter=3),
    "h4":         _ss("p_h4",         fontName="Helvetica-Bold", fontSize=10, textColor=C["muted"],    leading=15, spaceBefore=7,  spaceAfter=2),
    "body":       _ss("p_body",       fontSize=10,  textColor=C["muted"],    leading=16, spaceAfter=5),
    "li":         _ss("p_li",         fontSize=10,  textColor=C["muted"],    leading=15),
    "bq":         _ss("p_bq",         fontSize=10,  textColor=C["muted"],    leading=16),
    "code_blk":   _ss("p_code_blk",   fontName="Courier", fontSize=8.5, textColor=C["code_txt"], leading=13),
    "th":         _ss("p_th",         fontName="Helvetica-Bold", fontSize=9,  textColor=C["accent"],   leading=13),
    "td":         _ss("p_td",         fontSize=9,   textColor=C["muted"],    leading=13),
    "tip_txt":    _ss("p_tip_txt",    fontSize=10,  textColor=C["blue_txt"], leading=15),
    "metric_lbl": _ss("p_metric_lbl", fontName="Helvetica-Bold", fontSize=7.5, textColor=C["muted"],  leading=11, letterSpacing=0.5),
    "score_sub":  _ss("p_score_sub",  fontSize=10,  textColor=C["muted"],    leading=14, alignment=TA_CENTER),
    "ins_txt":    _ss("p_ins_txt",    fontSize=10,  textColor=C["green_txt"],  leading=15),
    "wrn_txt":    _ss("p_wrn_txt",    fontSize=10,  textColor=C["yellow_txt"], leading=15),
    "disclaimer": _ss("p_disclaimer", fontSize=7.5, textColor=C["faint"],    leading=11),
}


# ── Page canvas ────────────────────────────────────────────────────────────
def _page_canvas(canvas, doc):
    canvas.saveState()
    pw, ph = A4
    canvas.setFillColor(C["bg0"])
    canvas.rect(0, 0, pw, ph, fill=1, stroke=0)
    canvas.setFillColor(C["accent_dim"])
    canvas.rect(0, ph - 13 * mm, pw, 13 * mm, fill=1, stroke=0)
    canvas.setFillColor(C["accent"])
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(LEFT_M, ph - 8.5 * mm, "FinanceAI  \u00b7  AI Financial Advisory Report")
    canvas.setFillColor(C["muted"])
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(pw - RIGHT_M, ph - 8.5 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(C["faint"])
    canvas.setLineWidth(0.4)
    canvas.line(LEFT_M, 13 * mm, pw - RIGHT_M, 13 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(C["faint"])
    canvas.drawCentredString(pw / 2, 8 * mm,
        "AI-generated. Consult a SEBI-registered advisor before making investment decisions.")
    canvas.restoreState()


# ── Inline markup ──────────────────────────────────────────────────────────
def _inline(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\*{3}(.+?)\*{3}', r'<b><i>\1</i></b>', text)
    text = re.sub(r'\*{2}(.+?)\*{2}', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'`(.+?)`', r'<font name="Courier" color="#e2c97e">\1</font>', text)
    text = re.sub(r'~~(.+?)~~', r'<strike>\1</strike>', text)
    return text


# ── List renderer ──────────────────────────────────────────────────────────
def _render_list(items, ordered: bool, avail_w: float):
    """
    Fixed layout: 3 columns [indent | marker | text].
    Padding is applied ONLY to the marker and text columns (cols 1 and 2),
    never to col 0 (the indent spacer) — that's what caused the negative-width crash.
    """
    max_depth  = max((d for d, _ in items), default=0)
    indent_w   = max(max_depth * INDENT, 1)   # always ≥ 1 pt so ReportLab accepts it
    marker_w   = MARKER_W
    text_w     = max(avail_w - indent_w - marker_w, MIN_TEXT_W)

    # If text_w had to be clamped, shrink indent proportionally
    if avail_w - indent_w - marker_w < MIN_TEXT_W:
        indent_w = max(avail_w - marker_w - MIN_TEXT_W, 1)

    counters = {}
    rows     = []

    for depth, text in items:
        item_indent = depth * INDENT

        # col 0: plain Spacer — width doesn't matter for rendering, just indents visually
        indent_cell = Spacer(1, 1)

        # col 1: marker
        if ordered:
            for k in list(counters):
                if k > depth:
                    del counters[k]
            counters[depth] = counters.get(depth, 0) + 1
            marker_txt = f"{counters[depth]}."
            dot_col    = C["accent"]
        else:
            dot_col    = [C["accent"], C["muted"], C["faint"]][min(depth, 2)]
            marker_txt = "\u2022"   # bullet

        marker_st = _st(fontName="Helvetica-Bold",
                        fontSize=10 if ordered else 12,
                        textColor=dot_col, leading=15, alignment=TA_CENTER)

        # col 2: text — left-pad according to depth using leftIndent on the style
        text_st = _st(fontSize=10, textColor=C["muted"], leading=15,
                      leftIndent=item_indent)

        rows.append([indent_cell,
                     Paragraph(marker_txt, marker_st),
                     Paragraph(_inline(text), text_st)])

    t = Table(rows, colWidths=[indent_w, marker_w, text_w])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["bg3"]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        # ── col 0 (indent spacer): ZERO padding so it never goes negative ──
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 0),
        ("TOPPADDING",    (0, 0), (0, -1), 0),
        ("BOTTOMPADDING", (0, 0), (0, -1), 0),
        # ── col 1 (marker): small padding ──
        ("LEFTPADDING",   (1, 0), (1, -1), 4),
        ("RIGHTPADDING",  (1, 0), (1, -1), 4),
        ("TOPPADDING",    (1, 0), (1, -1), 6),
        ("BOTTOMPADDING", (1, 0), (1, -1), 6),
        # ── col 2 (text): normal padding ──
        ("LEFTPADDING",   (2, 0), (2, -1), 6),
        ("RIGHTPADDING",  (2, 0), (2, -1), 8),
        ("TOPPADDING",    (2, 0), (2, -1), 6),
        ("BOTTOMPADDING", (2, 0), (2, -1), 6),
        ("BOX",           (0, 0), (-1, -1), 0.4, C["faint"]),
    ] + ([("LINEBELOW", (0, 0), (-1, -2), 0.3, C["faint2"])] if len(rows) > 1 else [])))
    return t


# ── GFM table ──────────────────────────────────────────────────────────────
def _render_gfm_table(header_cells, body_rows, avail_w):
    ncols = max(len(header_cells), 1)
    col_w = avail_w / ncols
    data  = [[Paragraph(_inline(h.strip()), ST["th"]) for h in header_cells]]
    for row in body_rows:
        cells = [c.strip() for c in row]
        while len(cells) < ncols: cells.append("")
        data.append([Paragraph(_inline(c[:300]), ST["td"]) for c in cells[:ncols]])
    t = Table(data, colWidths=[col_w] * ncols)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1,  0), C["tbl_head"]),
        ("LINEBELOW",     (0, 0), (-1,  0), 0.5, C["accent_bdr"]),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C["bg3"], C["tbl_alt"]]),
        ("GRID",          (0, 0), (-1, -1), 0.3, C["faint"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["faint"]),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


# ── Blockquote ─────────────────────────────────────────────────────────────
def _render_blockquote(lines_text, avail_w):
    bar_w = 3 * mm
    gap   = 3 * mm
    txt_w = max(avail_w - bar_w - gap, MIN_TEXT_W)

    content_rows = [[Paragraph(_inline(ln.strip()), ST["bq"])]
                    for ln in lines_text if ln.strip()]
    if not content_rows:
        return Spacer(1, 4)

    txt_tbl = Table(content_rows, colWidths=[txt_w])
    txt_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["bg2"]),
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))

    # bar cell: Spacer so it's a proper flowable (not an empty string)
    bar_cell = Spacer(bar_w, 1)
    outer = Table([[bar_cell, txt_tbl]], colWidths=[bar_w + gap, txt_w])
    outer.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), C["accent"]),
        ("BACKGROUND",    (1, 0), (1, -1), C["bg2"]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        # zero padding on the bar column
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 0),
        ("TOPPADDING",    (0, 0), (0, -1), 0),
        ("BOTTOMPADDING", (0, 0), (0, -1), 0),
        # normal padding on text column
        ("LEFTPADDING",   (1, 0), (1, -1), 10),
        ("RIGHTPADDING",  (1, 0), (1, -1), 8),
        ("TOPPADDING",    (1, 0), (1, -1), 8),
        ("BOTTOMPADDING", (1, 0), (1, -1), 8),
        ("BOX",           (0, 0), (-1, -1), 0.4, C["accent_bdr"]),
    ]))
    return outer


# ── Tip callout ────────────────────────────────────────────────────────────
def _render_tip(text, avail_w):
    icon_w = 18
    txt_w  = max(avail_w - icon_w, MIN_TEXT_W)
    icon_st = _st(fontSize=11, leading=15, alignment=TA_CENTER)
    t = Table([[Paragraph("\U0001f4a1", icon_st),
                Paragraph(_inline(text), ST["tip_txt"])]],
              colWidths=[icon_w, txt_w])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["blue_dim"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["blue_bdr"]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        # zero padding on icon col
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 4),
        ("TOPPADDING",    (0, 0), (0, -1), 8),
        ("BOTTOMPADDING", (0, 0), (0, -1), 8),
        # normal padding on text col
        ("LEFTPADDING",   (1, 0), (1, -1), 6),
        ("RIGHTPADDING",  (1, 0), (1, -1), 8),
        ("TOPPADDING",    (1, 0), (1, -1), 8),
        ("BOTTOMPADDING", (1, 0), (1, -1), 8),
    ]))
    return t


# ── Fenced code block ──────────────────────────────────────────────────────
def _render_code_block(code_lines, avail_w):
    text = "\n".join(code_lines)
    p = Preformatted(text, ST["code_blk"])
    w = Table([[p]], colWidths=[avail_w])
    w.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["code_bg"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["faint"]),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    return w


# ── List depth from leading spaces ─────────────────────────────────────────
def _depth(raw: str) -> int:
    return (len(raw) - len(raw.lstrip(" "))) // 2


# ── Main markdown parser ───────────────────────────────────────────────────
def parse_md(md_text: str, avail_w: float = CW) -> list:
    if not md_text:
        return [Paragraph("No content generated.", ST["body"])]

    story   = []
    lines   = md_text.split("\n")
    ul_buf, ol_buf, bq_buf, cb_buf = [], [], [], []
    in_cb   = False
    tbl_hdr = None
    tbl_rows= []

    def flush_ul():
        nonlocal ul_buf
        if ul_buf:
            story.append(_render_list(ul_buf, False, avail_w))
            story.append(Spacer(1, 5))
            ul_buf = []

    def flush_ol():
        nonlocal ol_buf
        if ol_buf:
            story.append(_render_list(ol_buf, True, avail_w))
            story.append(Spacer(1, 5))
            ol_buf = []

    def flush_bq():
        nonlocal bq_buf
        if bq_buf:
            story.append(_render_blockquote(bq_buf, avail_w))
            story.append(Spacer(1, 5))
            bq_buf = []

    def flush_tbl():
        nonlocal tbl_hdr, tbl_rows
        if tbl_hdr is not None:
            story.append(_render_gfm_table(tbl_hdr, tbl_rows, avail_w))
            story.append(Spacer(1, 6))
            tbl_hdr = None
            tbl_rows = []

    def flush_all():
        flush_ul(); flush_ol(); flush_bq(); flush_tbl()

    for raw in lines:
        s = raw.strip()

        # fenced code block
        if re.match(r'^(`{3,}|~{3,})', s):
            if in_cb:
                flush_all()
                story.append(_render_code_block(cb_buf, avail_w))
                story.append(Spacer(1, 5))
                cb_buf = []; in_cb = False
            else:
                flush_all(); cb_buf = []; in_cb = True
            continue

        if in_cb:
            cb_buf.append(raw); continue

        # blank line
        if not s:
            flush_ul(); flush_ol(); flush_bq()
            continue

        # tip line
        if s.startswith("\U0001f4a1"):
            flush_all()
            story.append(_render_tip(s[1:].strip(), avail_w))
            story.append(Spacer(1, 5))
            continue

        # horizontal rule
        if re.match(r'^([-*_]){3,}$', s):
            flush_all()
            story.append(HRFlowable(width="100%", thickness=0.5, color=C["faint"]))
            story.append(Spacer(1, 4))
            continue

        # headings # ## ### ####
        hm = re.match(r'^(#{1,4})\s+(.*)', s)
        if hm:
            flush_all()
            level  = len(hm.group(1))
            htext  = hm.group(2).strip()
            hstyle = {1: ST["h1"], 2: ST["h2"], 3: ST["h3"], 4: ST["h4"]}[level]
            story.append(Paragraph(_inline(htext), hstyle))
            if level <= 2:
                story.append(HRFlowable(width="100%", thickness=0.4,
                    color=C["accent_bdr"] if level == 2 else C["faint"]))
                story.append(Spacer(1, 3))
            continue

        # GFM table row
        if "|" in s and not re.match(r'^[\s|:-]+$', s):
            flush_ul(); flush_ol(); flush_bq()
            parts = [c.strip() for c in s.split("|")]
            if parts and parts[0]  == "": parts = parts[1:]
            if parts and parts[-1] == "": parts = parts[:-1]
            if tbl_hdr is None:
                tbl_hdr = parts; tbl_rows = []
            else:
                tbl_rows.append(parts)
            continue

        # table separator |---|---|
        if re.match(r'^[\s|:-]+$', s) and "|" in s:
            continue

        # end of table when non-table line encountered
        if tbl_hdr is not None:
            flush_tbl()

        # blockquote
        bm = re.match(r'^(>+)\s*(.*)', s)
        if bm:
            flush_ul(); flush_ol()
            bq_buf.append(bm.group(2))
            continue
        else:
            flush_bq()

        # unordered list
        um = re.match(r'^(\s*)[-*+]\s+(.*)', raw)
        if um:
            flush_ol()
            ul_buf.append((_depth(raw), um.group(2).strip()))
            continue

        # ordered list
        om = re.match(r'^(\s*)\d+[.)]\s+(.*)', raw)
        if om:
            flush_ul()
            ol_buf.append((_depth(raw), om.group(2).strip()))
            continue

        # plain paragraph
        flush_ul(); flush_ol()
        if s:
            story.append(Paragraph(_inline(s), ST["body"]))

    flush_all()
    return story


# ── Structural builders ────────────────────────────────────────────────────
def _fmt_inr(v):
    try:    return f"\u20b9{float(v):,.0f}"
    except: return str(v)


def _score_palette(score):
    if score >= 70:
        return C["green"],  colors.HexColor("#0a2419"), colors.HexColor("#1a4a30"), C["green_txt"]
    if score >= 50:
        return C["yellow"], C["yellow_dim"], C["yellow_bdr"], C["yellow_txt"]
    return C["red"], colors.HexColor("#2a0c0c"), colors.HexColor("#4a1010"), colors.HexColor("#fca5a5")


def _build_cover(profile, now):
    goal = profile.get("financial_goals") or "Not specified"
    risk = (profile.get("risk_appetite") or "\u2014").capitalize()
    age  = profile.get("age", "\u2014")
    return [
        Spacer(1, 8 * mm),
        Paragraph("AI Financial Advisory Report", ST["doc_title"]),
        Paragraph(f"Generated on {now}", ST["doc_sub"]),
        Spacer(1, 3 * mm),
        Paragraph(f"Goal: {goal}  \u00b7  Risk: {risk}  \u00b7  Age: {age}", ST["doc_meta"]),
        Spacer(1, 5 * mm),
        HRFlowable(width="100%", thickness=0.5, color=C["faint"]),
        Spacer(1, 5 * mm),
    ]


def _build_snapshot(profile):
    income   = float(profile.get("income",   0) or 0)
    expenses = float(profile.get("expenses", 0) or 0)
    savings  = float(profile.get("savings",  0) or 0)
    risk     = (profile.get("risk_appetite") or "\u2014").capitalize()
    sav_rate = round((savings  / income) * 100) if income else 0
    exp_rate = round((expenses / income) * 100) if income else 0

    # Each cell is a list of flowables stacked vertically inside its column.
    # We use a nested 1-col Table so padding doesn't escape into neighbours.
    def metric_cell(lbl, val, sub="", val_col=C["white"]):
        vs = _st(fontName="Helvetica-Bold", fontSize=16, textColor=val_col, leading=20)
        ss = _st(fontSize=8, textColor=C["muted"], leading=11)
        inner_rows = [
            [Paragraph(lbl.upper(), ST["metric_lbl"])],
            [Paragraph(val, vs)],
        ]
        if sub:
            inner_rows.append([Paragraph(sub, ss)])
        col_w = CW / 4 - 20   # subtract left+right padding of outer cell
        cell_t = Table(inner_rows, colWidths=[col_w])
        cell_t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        return cell_t

    cw4 = CW / 4
    t = Table([[
        metric_cell("Monthly Income",   _fmt_inr(income)),
        metric_cell("Monthly Expenses", _fmt_inr(expenses), f"{exp_rate}% of income",    C["red"]),
        metric_cell("Monthly Savings",  _fmt_inr(savings),  f"{sav_rate}% savings rate", C["green"]),
        metric_cell("Risk Appetite",    risk),
    ]], colWidths=[cw4] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["bg2"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["faint"]),
        ("LINEAFTER",     (0, 0), (2,  0),  0.5, C["faint"]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    return t


def _build_score(score):
    col, dim, bdr, _ = _score_palette(score)
    label = "Healthy" if score >= 70 else "Moderate" if score >= 50 else "At Risk"
    sc_st = _st(fontName="Helvetica-Bold", fontSize=40, textColor=col, leading=46, alignment=TA_CENTER)
    lb_st = _st(fontSize=11, textColor=col, leading=15, alignment=TA_CENTER)
    inner = Table([
        [Paragraph(str(score), sc_st)],
        [Paragraph("/ 100",    ST["score_sub"])],
        [Paragraph(label,      lb_st)],
    ], colWidths=[120 * mm])
    inner.setStyle(TableStyle([
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
        ("LEFTPADDING",    (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 0),
    ]))
    outer = Table([[inner]], colWidths=[CW])
    outer.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), dim),
        ("BOX",           (0, 0), (-1, -1), 1, col),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    return outer


def _build_insights_warnings(health_data):
    story  = []
    groups = [
        (health_data.get("insights", []), "\u2713", "Strengths",
         C["green"],  colors.HexColor("#0a2419"), colors.HexColor("#1a4a30"), ST["ins_txt"]),
        (health_data.get("warnings", []), "!",  "Areas to Improve",
         C["yellow"], C["yellow_dim"], C["yellow_bdr"], ST["wrn_txt"]),
    ]
    for items, icon, title, col, dim, bdr, txt_st in groups:
        if not items:
            continue
        lbl_st = _st(fontName="Helvetica-Bold", fontSize=8.5, textColor=C["muted"],
                     leading=13, spaceBefore=6, spaceAfter=3, letterSpacing=0.6)
        story.append(Paragraph(title.upper(), lbl_st))

        icon_w = 14
        txt_w  = CW - icon_w

        icon_st = _st(fontName="Helvetica-Bold", fontSize=11,
                      textColor=col, leading=15, alignment=TA_CENTER)
        item_st = _st(fontSize=10, textColor=txt_st.textColor, leading=15)

        rows = [[Paragraph(icon, icon_st), Paragraph(item, item_st)]
                for item in items]

        t = Table(rows, colWidths=[icon_w, txt_w])
        cmds = [
            ("BACKGROUND",    (0, 0), (-1, -1), dim),
            ("BOX",           (0, 0), (-1, -1), 0.5, bdr),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            # icon col — minimal padding
            ("LEFTPADDING",   (0, 0), (0, -1), 4),
            ("RIGHTPADDING",  (0, 0), (0, -1), 4),
            ("TOPPADDING",    (0, 0), (0, -1), 7),
            ("BOTTOMPADDING", (0, 0), (0, -1), 7),
            # text col
            ("LEFTPADDING",   (1, 0), (1, -1), 6),
            ("RIGHTPADDING",  (1, 0), (1, -1), 8),
            ("TOPPADDING",    (1, 0), (1, -1), 7),
            ("BOTTOMPADDING", (1, 0), (1, -1), 7),
        ]
        if len(rows) > 1:
            cmds.append(("LINEBELOW", (0, 0), (-1, -2), 0.3, C["faint2"]))
        t.setStyle(TableStyle(cmds))
        story.append(t)
        story.append(Spacer(1, 8))
    return story


def _sec(num, title):
    return [
        Paragraph(f"{num}  {title}", ST["sec_num"]),
        HRFlowable(width="100%", thickness=0.5, color=C["accent_bdr"]),
        Spacer(1, 5),
    ]


# ── Public entry point ─────────────────────────────────────────────────────
def generate_pdf_report(profile, health_data, ai_report,
                        filename="financial_report.pdf"):
    try:
        file_path = os.path.join(os.getcwd(), filename)
        now = datetime.now().strftime("%d %B %Y, %I:%M %p")

        doc = SimpleDocTemplate(
            file_path, pagesize=A4,
            topMargin=TOP_M, bottomMargin=BOT_M,
            leftMargin=LEFT_M, rightMargin=RIGHT_M,
        )

        story = []
        story.extend(_build_cover(profile, now))
        story.extend(_sec("01", "Financial Snapshot"))
        story.append(_build_snapshot(profile))
        story.append(Spacer(1, 10))
        story.extend(_sec("02", "Financial Health Score"))
        story.append(_build_score(health_data.get("score", 0)))
        story.append(Spacer(1, 10))
        story.extend(_sec("03", "Insights & Warnings"))
        story.extend(_build_insights_warnings(health_data))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C["faint"]))
        story.extend(_sec("04", "Personalised AI Advice"))
        story.extend(parse_md(ai_report, avail_w=CW))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C["faint"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "Disclaimer: This report is AI-generated using the financial data you provided. "
            "It is for informational purposes only and does not constitute professional "
            "financial, investment, or legal advice. Consult a SEBI-registered financial "
            "advisor before making any investment decisions.",
            ST["disclaimer"]
        ))

        doc.build(story, onFirstPage=_page_canvas, onLaterPages=_page_canvas)
        print(f"[PDF] Saved: {file_path}")
        return True, file_path

    except Exception as e:
        import traceback; traceback.print_exc()
        return False, str(e)