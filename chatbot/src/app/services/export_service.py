"""
ExportService — Chat conversation PDF generation

Generates a branded, confidential PDF export of a conversation thread
using reportlab (pure Python, no system/browser dependencies — Lambda-safe).

PDF structure

  Header  : BSPBlueprint platform name, conversation title,
            exported-by name, export date and time
  Body    : chronological messages — date/time, sender label, content
  Footer  : CONFIDENTIAL | Page X of Y | privacy disclaimer (every page)

Design decisions

  • MAX_EXPORT_MESSAGES = 500  — safety cap; most threads are well under 100.
  • Basic markdown stripped to plain text before rendering.
  • Emoji and non-representable Unicode are removed to avoid encoding errors
    with built-in Helvetica (no external font embedding needed).
  • NumberedCanvas enables "Page X of Y" in the footer via a two-pass build.
  • KeepTogether wraps the timestamp + sender + first content line of each
    message to prevent awkward mid-header page breaks.
"""

from __future__ import annotations

import io
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer
from reportlab.platypus.flowables import KeepTogether

#  Constants 

MAX_EXPORT_MESSAGES = 500

_BRAND_BLUE         = colors.HexColor("#305fa1")
_BRAND_DARK         = colors.HexColor("#2f414a")
_BRAND_MUTED        = colors.HexColor("#498291")
_BRAND_BORDER       = colors.HexColor("#ddd9eb")
_BRAND_SUCCESS      = colors.HexColor("#2f8f6b")

_PLATFORM_NAME      = "BSPBlueprint"
_BOT_LABEL          = "Bispy Bot"
_FOOTER_CONFIDENTIAL = "CONFIDENTIAL"
_FOOTER_DISCLAIMER  = (
    "This export may contain sensitive personal or coaching information. "
    "Please store and share it securely."
)

_PERSONA_LABEL: dict[str, str] = {
    "employee"  : "Employee",
    "coach"     : "Coach",
    "superadmin": "Super Admin",
    "default"   : "User",
}

# Page geometry
_PAGE_W, _PAGE_H = LETTER
_MARGIN_H        = 0.85 * inch
_MARGIN_TOP      = 0.75 * inch
_MARGIN_BOTTOM   = 0.90 * inch   # taller to leave room for two-line footer


### Markdown → plain text 

def _strip_markdown(text: str) -> str:
    """
    Convert common LLM markdown to plain text suitable for reportlab Paragraph.

    Preserves bullet points as "•" and keeps numbered-list numbers.
    Strips bold/italic markers, headers, code fences, and links.
    """
    # Fenced code blocks → placeholder
    text = re.sub(r"```[\s\S]*?```", "[code block]", text)
    # Inline code
    text = re.sub(r"`([^`\n]+)`", r"\1", text)
    # Bold + italic combined (***text***)
    text = re.sub(r"\*{3}(.+?)\*{3}", r"\1", text, flags=re.DOTALL)
    # Bold (**text**)
    text = re.sub(r"\*{2}(.+?)\*{2}", r"\1", text, flags=re.DOTALL)
    # Italic (*text* or _text_)
    text = re.sub(r"\*(.+?)\*",  r"\1", text, flags=re.DOTALL)
    text = re.sub(r"_(.+?)_",    r"\1", text, flags=re.DOTALL)
    # Links  [text](url) → text
    text = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", text)
    # ATX headers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    # Unordered bullets → •
    text = re.sub(r"^[ \t]*[-*+]\s+", "• ", text, flags=re.MULTILINE)
    # Collapse 3+ consecutive blank lines → 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _safe_xml(text: str) -> str:
    """
    Escape characters that break reportlab's XML-based Paragraph renderer
    and drop emoji / non-representable characters that Helvetica can't encode.
    """
    # Strip emoji and supplementary-plane characters (Helvetica can't encode them)
    text = re.sub(r"[\U00010000-\U0010ffff]", "", text)
    # Strip other non-printable unicode categories except common spaces
    text = "".join(
        ch for ch in text
        if unicodedata.category(ch)[0] not in ("C",) or ch in ("\n", "\t")
    )
    # XML-escape remaining special chars
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return text


### Footer (NumberedCanvas) 

class _NumberedCanvas(rl_canvas.Canvas):
    """
    Two-pass canvas that knows the total page count.

    reportlab's standard Canvas renders pages eagerly; to write "Page X of Y"
    in the footer, we buffer all page states in showPage() and do the actual
    rendering in save() once the total is known.

    Also overrides the PDF Producer metadata field so the exported file does
    not expose the third-party library name and version in its info dictionary.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        rl_canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self) -> None:  # type: ignore[override]
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:  # type: ignore[override]
        try:
            self._doc.info.producer = _PLATFORM_NAME
        except Exception:
            pass

        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total)
            rl_canvas.Canvas.showPage(self)
        rl_canvas.Canvas.save(self)

    def _draw_footer(self, total_pages: int) -> None:
        self.saveState()

        footer_line_y   = _MARGIN_BOTTOM - 0.22 * inch
        footer_text1_y  = footer_line_y  - 0.14 * inch
        footer_text2_y  = footer_text1_y - 0.14 * inch
        usable_right    = _PAGE_W - _MARGIN_H

        # Separator line
        self.setStrokeColor(_BRAND_BORDER)
        self.setLineWidth(0.5)
        self.line(_MARGIN_H, footer_line_y, usable_right, footer_line_y)

        # Line 1: CONFIDENTIAL (left) | Page X of Y (right)
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(_BRAND_MUTED)
        self.drawString(_MARGIN_H, footer_text1_y, _FOOTER_CONFIDENTIAL)

        self.setFont("Helvetica", 7.5)
        page_label = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(usable_right, footer_text1_y, page_label)

        # Line 2: privacy disclaimer (centred, smaller)
        self.setFont("Helvetica", 6.5)
        self.setFillColor(_BRAND_MUTED)
        self.drawCentredString(_PAGE_W / 2, footer_text2_y, _FOOTER_DISCLAIMER)

        self.restoreState()


### Styles 

def _build_styles() -> dict[str, ParagraphStyle]:
    base = ParagraphStyle("_base", fontName="Helvetica", fontSize=10,
                          leading=15, textColor=_BRAND_DARK, alignment=TA_LEFT)

    return {
        "platform": ParagraphStyle(
            "platform", parent=base,
            fontName="Helvetica-Bold", fontSize=20,
            textColor=_BRAND_BLUE, leading=24, spaceAfter=4,
        ),
        "title": ParagraphStyle(
            "title", parent=base,
            fontName="Helvetica-Bold", fontSize=14,
            textColor=_BRAND_DARK, leading=18, spaceAfter=3,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base,
            fontName="Helvetica", fontSize=9,
            textColor=_BRAND_MUTED, leading=13,
        ),
        "timestamp": ParagraphStyle(
            "timestamp", parent=base,
            fontName="Helvetica", fontSize=8,
            textColor=_BRAND_MUTED, leading=12, spaceBefore=10,
        ),
        "sender_user": ParagraphStyle(
            "sender_user", parent=base,
            fontName="Helvetica-Bold", fontSize=10,
            textColor=_BRAND_DARK, leading=14, spaceBefore=2, spaceAfter=2,
        ),
        "sender_bot": ParagraphStyle(
            "sender_bot", parent=base,
            fontName="Helvetica-Bold", fontSize=10,
            textColor=_BRAND_BLUE, leading=14, spaceBefore=2, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "body", parent=base,
            fontName="Helvetica", fontSize=10,
            textColor=_BRAND_DARK, leading=15, spaceAfter=3,
        ),
    }


### Helpers 

def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%-I:%M %p")


def _fmt_date(dt: datetime) -> str:
    return dt.strftime("%B %-d, %Y")


def _fmt_datetime(dt: Any) -> str:
    """
    Time first, then calendar date — e.g. '9:36 AM, June 4, 2026'.

    Used for the export header and per-message timestamps in the PDF.
    """
    if isinstance(dt, datetime):
        return f"{_fmt_time(dt)}, {_fmt_date(dt)}"
    return str(dt) if dt else ""


def _slugify(text: str) -> str:
    """URL/filename-safe slug, max 50 characters."""
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug[:50]


def export_filename(thread_title: str) -> str:
    """Generate the PDF filename per the naming convention in req.md."""
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slug     = _slugify(thread_title) or "conversation"
    return f"conversation-{slug}-{date_str}.pdf"


### PDF assembly 

def generate_chat_pdf(
    *,
    thread_title: str,
    exported_by : str,
    persona     : str,
    messages    : list[dict],
) -> bytes:
    """
    Generate and return PDF bytes for a conversation thread export.

    Args:
        thread_title: The conversation title shown in the PDF header.
        exported_by:  Display name of the requesting user.
        persona:      Thread persona (employee | coach | default | superadmin).
        messages:     List of dicts with keys: role, content, created_at.
                      Only 'user' and 'assistant' roles are expected here;
                      filtering happens in ThreadService.list_all_messages_for_export.

    Returns:
        Raw PDF bytes ready to stream in an HTTP response.
    """
    buffer = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize    = LETTER,
        leftMargin  = _MARGIN_H,
        rightMargin = _MARGIN_H,
        topMargin   = _MARGIN_TOP,
        bottomMargin= _MARGIN_BOTTOM,
        title       = "Title: " + thread_title,
        author      = _PLATFORM_NAME,
        subject     = "Confidential chat export",
        creator     = _PLATFORM_NAME,
    )

    user_label = _PERSONA_LABEL.get(persona, "User")
    export_dt  = datetime.now(timezone.utc)
    story: list = []

    #  Header block 
    story.append(Paragraph(_PLATFORM_NAME, styles["platform"]))
    story.append(HRFlowable(
        width="100%", thickness=1.0,
        color=_BRAND_BLUE, spaceAfter=6,
    ))
    story.append(Paragraph(_safe_xml(thread_title), styles["title"]))
    story.append(Paragraph(
        f"Exported by: <b>{_safe_xml(exported_by)}</b>"
        f"&nbsp;&nbsp;&nbsp;&nbsp;"
        f"Export date: <b>{_safe_xml(_fmt_datetime(export_dt))}</b>",
        styles["meta"],
    ))
    story.append(HRFlowable(
        width="100%", thickness=0.5,
        color=_BRAND_BORDER, spaceBefore=10, spaceAfter=16,
    ))

    #  Message blocks 
    if not messages:
        story.append(Paragraph(
            "This conversation has no messages to export.",
            ParagraphStyle("empty", parent=styles["body"], textColor=_BRAND_MUTED),
        ))
    else:
        for msg in messages[:MAX_EXPORT_MESSAGES]:
            role       = msg.get("role", "user")
            raw_content = msg.get("content", "")
            created_at  = msg.get("created_at")

            is_bot      = role == "assistant"
            sender_name = _BOT_LABEL if is_bot else user_label
            sender_style = styles["sender_bot"] if is_bot else styles["sender_user"]

            plain   = _strip_markdown(raw_content)
            time_str = _fmt_datetime(created_at)

            # Split content into paragraphs (blank lines between them)
            paras = [p.strip() for p in plain.split("\n\n") if p.strip()]
            if not paras:
                paras = [plain or "(empty)"]

            # Build the message block
            block: list = []
            if time_str:
                block.append(Paragraph(time_str, styles["timestamp"]))
            block.append(Paragraph(_safe_xml(sender_name), sender_style))

            for para_text in paras:
                # Further split on single newlines (e.g. bullet lists)
                lines = [l for l in para_text.split("\n") if l.strip()]
                for line in lines:
                    block.append(Paragraph(_safe_xml(line), styles["body"]))

            block.append(Spacer(1, 4))

            # Keep the timestamp + sender + first body line together on same page
            anchor = block[:3]
            rest   = block[3:]
            story.append(KeepTogether(anchor))
            for item in rest:
                story.append(item)

    story.append(Spacer(1, 0.3 * inch))

    doc.build(story, canvasmaker=_NumberedCanvas)
    return buffer.getvalue()
