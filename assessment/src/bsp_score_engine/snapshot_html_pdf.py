"""
PDF export from a self-contained HTML snapshot (no live SPA or print token).
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable

from bsp_score_engine.print_route_pdf import (
    A4_LANDSCAPE_HEIGHT_PX,
    A4_LANDSCAPE_WIDTH_PX,
    CHROMIUM_LAUNCH_ARGS,
    DEFAULT_PDF_FORMAT,
    DEFAULT_PDF_SCALE,
    resolve_print_base_url,
    write_assessment_print_pdf,
)
from utils.logger import logger


@dataclass(frozen=True)
class SnapshotHtmlPdfOptions:
    base_url: str
    expected_page_count: int = 20
    pdf_scale: float = DEFAULT_PDF_SCALE
    pdf_format: str = DEFAULT_PDF_FORMAT
    print_background: bool = True
    prefer_css_page_size: bool = True
    load_timeout_ms: int = 120_000


def resolve_snapshot_html_pdf_options() -> SnapshotHtmlPdfOptions:
    expected_pages = int(os.environ.get("PRINT_EXPECTED_PAGES", "20"))
    pdf_scale = float(os.environ.get("PRINT_PDF_SCALE", str(DEFAULT_PDF_SCALE)))
    pdf_format = os.environ.get("PRINT_PDF_FORMAT", DEFAULT_PDF_FORMAT)
    print_background = os.environ.get("PRINT_PDF_BACKGROUND", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    prefer_css = os.environ.get("PRINT_PDF_PREFER_CSS_PAGE_SIZE", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    return SnapshotHtmlPdfOptions(
        base_url=resolve_print_base_url(),
        expected_page_count=expected_pages,
        pdf_scale=pdf_scale,
        pdf_format=pdf_format,
        print_background=print_background,
        prefer_css_page_size=prefer_css,
    )


def _wait_for_snapshot_assets(page, timeout_ms: int) -> None:
    """Let inlined CSS apply and remote images/fonts finish loading."""
    page.wait_for_load_state("networkidle", timeout=timeout_ms)
    page.evaluate(
        """async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
          const imgs = Array.from(document.images || []);
          await Promise.all(
            imgs.map(
              (img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise((res) => {
                      img.onload = () => res(undefined);
                      img.onerror = () => res(undefined);
                    }),
            ),
          );
        }"""
    )


def generate_snapshot_html_pdf(
    html: str,
    output_path: str,
    *,
    assessment_id: str,
    options: SnapshotHtmlPdfOptions | None = None,
    playwright_factory: Callable | None = None,
) -> str:
    """
    Render self-contained HTML (inlined CSS) in headless Chromium and write a PDF.

    Layout CSS uses one ``100vh`` sheet per report page; PDF uses A4 landscape,
    margin 0, scale 1.15 — matching Chrome print preview (20 pages).
    """
    if not (html or "").strip():
        raise ValueError("HTML snapshot is empty")

    opts = options or resolve_snapshot_html_pdf_options()
    logger.info(
        "snapshot_html_pdf_started",
        extra={
            "assessment_id": str(assessment_id),
            "base_url": opts.base_url,
            "html_bytes": len(html.encode("utf-8")),
            "pdf_scale": opts.pdf_scale,
            "prefer_css_page_size": opts.prefer_css_page_size,
        },
    )

    if playwright_factory is None:
        from playwright.sync_api import sync_playwright

        def _factory():
            return sync_playwright()

        playwright_factory = _factory

    with playwright_factory() as p:
        browser = p.chromium.launch(
            headless=True,
            args=CHROMIUM_LAUNCH_ARGS,
        )
        context = browser.new_context(
            viewport={
                "width": A4_LANDSCAPE_WIDTH_PX,
                "height": A4_LANDSCAPE_HEIGHT_PX,
            },
            device_scale_factor=1,
        )
        page = context.new_page()
        page.set_content(
            html,
            wait_until="domcontentloaded",
            timeout=opts.load_timeout_ms,
        )

        page.wait_for_selector(
            "[data-assessment-print-root]",
            timeout=opts.load_timeout_ms,
        )
        page.wait_for_selector(
            "[data-assessment-print-pages]",
            timeout=30_000,
        )

        try:
            _wait_for_snapshot_assets(page, min(opts.load_timeout_ms, 60_000))
        except Exception as exc:
            logger.warning(
                "snapshot_html_pdf_asset_wait_partial",
                extra={"assessment_id": str(assessment_id), "error": repr(exc)},
            )

        sheet_count = page.locator("[data-print-page-sheet]").count()
        if sheet_count < 1:
            raise RuntimeError(
                "HTML snapshot has no print pages; refusing to write a blank PDF."
            )
        if sheet_count != opts.expected_page_count:
            logger.warning(
                "snapshot_html_pdf_unexpected_sheet_count",
                extra={
                    "assessment_id": str(assessment_id),
                    "expected": opts.expected_page_count,
                    "actual": sheet_count,
                },
            )

        write_assessment_print_pdf(
            page,
            output_path,
            pdf_format=opts.pdf_format,
            pdf_scale=opts.pdf_scale,
            print_background=opts.print_background,
            prefer_css_page_size=opts.prefer_css_page_size,
        )
        context.close()
        browser.close()

    logger.info(
        "snapshot_html_pdf_completed",
        extra={"assessment_id": str(assessment_id), "output_path": output_path},
    )
    return output_path
