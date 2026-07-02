"""
Shared Playwright PDF settings for assessment report exports (HTML snapshot pipeline).
"""
from __future__ import annotations

import os

from api.cors_env import frontend_origin_for_environment

# A4 landscape CSS px at 96dpi — one viewport page = one printed sheet (100vh/100vw).
A4_LANDSCAPE_WIDTH_PX = 1123
A4_LANDSCAPE_HEIGHT_PX = 794

CHROMIUM_LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
]

# Chrome print dialog defaults for assessment reports (A4 landscape, margin none, scale 115%).
DEFAULT_PDF_SCALE = 1.15
DEFAULT_PDF_FORMAT = "A4"
DEFAULT_PDF_MARGINS = {"top": "0", "right": "0", "bottom": "0", "left": "0"}


def write_assessment_print_pdf(
    page,
    output_path: str,
    *,
    pdf_format: str = DEFAULT_PDF_FORMAT,
    pdf_scale: float = DEFAULT_PDF_SCALE,
    print_background: bool = True,
    prefer_css_page_size: bool = False,
) -> None:
    """
    Emit PDF using the same settings as Chrome print preview (Save as PDF).

    ``prefer_css_page_size=True`` honors ``@page { size: A4 landscape; margin: 0 }`` so each
    ``100vh`` sheet maps to one PDF page (required for HTML snapshot exports).
    """
    page.emulate_media(media="print")
    page.pdf(
        path=output_path,
        format=pdf_format,
        landscape=True,
        print_background=print_background,
        prefer_css_page_size=prefer_css_page_size,
        scale=pdf_scale,
        margin=DEFAULT_PDF_MARGINS,
    )


def resolve_print_base_url() -> str:
    """Frontend origin for resolving relative asset URLs in HTML snapshots."""
    explicit = (os.environ.get("PRINT_BASE_URL") or "").strip().rstrip("/")
    if explicit:
        return explicit
    env = os.environ.get("ENVIRONMENT", "development")
    origin = frontend_origin_for_environment(env).rstrip("/")
    if origin:
        return origin
    raise ValueError(
        "PRINT_BASE_URL is required when ENVIRONMENT has no mapped frontend origin "
        "(set print_base_url in CDK config or PRINT_BASE_URL on the report worker)."
    )
