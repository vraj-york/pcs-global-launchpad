import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { AssessmentReportPrintCaptureHost } from "@/components";
import {
	ASSESSMENT_REPORT_PRINT_GLOBAL_STYLE,
	ASSESSMENT_REPORT_PRINT_SNAPSHOT_STYLES,
	ASSESSMENT_REPORT_PRINT_TOTAL_PAGES,
} from "@/const";

function escapeHtmlAttr(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function escapeStyleText(css: string): string {
	return css.replaceAll("</style", "<\\/style");
}

export function resolveSnapshotPublicOrigin(captureOrigin: string): string {
	return captureOrigin.trim().replace(/\/$/, "");
}

function toAbsoluteUrl(url: string, baseOrigin: string): string {
	try {
		return new URL(url, baseOrigin).href;
	} catch {
		return url;
	}
}

export function rewriteUrlsInText(text: string, captureOrigin: string): string {
	const publicOrigin = resolveSnapshotPublicOrigin(captureOrigin);
	return text.replace(
		/url\(\s*\/([^)]+)\)/g,
		(_, path: string) => `url(${publicOrigin}/${path})`,
	);
}

function rewriteRootUrls(root: HTMLElement, captureOrigin: string): void {
	for (const img of root.querySelectorAll("img[src]")) {
		const src = img.getAttribute("src");
		if (src && !src.startsWith("data:")) {
			const abs = toAbsoluteUrl(src, captureOrigin);
			img.setAttribute("src", rewriteUrlsInText(abs, captureOrigin));
		}
	}
	for (const el of root.querySelectorAll("[srcset]")) {
		const srcset = el.getAttribute("srcset");
		if (srcset) {
			const absolute = srcset
				.split(",")
				.map((part) => {
					const trimmed = part.trim();
					const [u, descriptor] = trimmed.split(/\s+/, 2);
					const abs = rewriteUrlsInText(
						toAbsoluteUrl(u ?? trimmed, captureOrigin),
						captureOrigin,
					);
					return descriptor ? `${abs} ${descriptor}` : abs;
				})
				.join(", ");
			el.setAttribute("srcset", absolute);
		}
	}
	for (const use of root.querySelectorAll("use[href]")) {
		const href = use.getAttribute("href");
		if (href?.startsWith("#")) {
			continue;
		}
		if (href) {
			use.setAttribute(
				"href",
				rewriteUrlsInText(toAbsoluteUrl(href, captureOrigin), captureOrigin),
			);
		}
	}
	for (const anchor of root.querySelectorAll("a[href]")) {
		const href = anchor.getAttribute("href");
		if (
			!href ||
			href.startsWith("#") ||
			href.startsWith("mailto:") ||
			href.startsWith("tel:")
		) {
			continue;
		}
		anchor.setAttribute("href", toAbsoluteUrl(href, captureOrigin));
	}
}

function isSameOriginUrl(url: string, origin: string): boolean {
	try {
		return new URL(url).origin === new URL(origin).origin;
	} catch {
		return false;
	}
}

function isOptionalExternalStylesheet(href: string): boolean {
	return (
		href.includes("fonts.googleapis.com") || href.includes("fonts.gstatic.com")
	);
}

function collectStyleElementsFromDocument(doc: Document): string {
	const blocks: string[] = [];
	for (const el of doc.querySelectorAll("style")) {
		const text = el.textContent?.trim();
		if (text) {
			blocks.push(text);
		}
	}
	return blocks.join("\n");
}

async function fetchLinkedStylesheets(
	doc: Document,
	captureOrigin: string,
): Promise<string> {
	const hrefs = new Set<string>();
	for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
		const href = link.getAttribute("href");
		if (!href) {
			continue;
		}
		const absolute = toAbsoluteUrl(href, captureOrigin);
		if (!isSameOriginUrl(absolute, captureOrigin)) {
			continue;
		}
		hrefs.add(absolute);
	}

	const chunks: string[] = [];
	for (const href of hrefs) {
		try {
			const res = await fetch(href, { credentials: "include", mode: "cors" });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const css = await res.text();
			chunks.push(`/* ${href} */\n${rewriteUrlsInText(css, captureOrigin)}`);
		} catch (err) {
			if (isOptionalExternalStylesheet(href)) {
				continue;
			}
			throw new Error(
				`Failed to load stylesheet ${href}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
	return chunks.join("\n");
}

export async function collectInlinedStylesForSnapshot(
	doc: Document,
	captureOrigin: string,
): Promise<string> {
	const parts = [
		collectStyleElementsFromDocument(doc),
		await fetchLinkedStylesheets(doc, captureOrigin),
		ASSESSMENT_REPORT_PRINT_GLOBAL_STYLE,
		ASSESSMENT_REPORT_PRINT_SNAPSHOT_STYLES,
	];
	return parts
		.filter(Boolean)
		.map((block) => rewriteUrlsInText(block, captureOrigin))
		.join("\n");
}

export async function buildAssessmentPrintHtmlSnapshot(
	doc: Document,
): Promise<string> {
	const captureOrigin =
		doc.defaultView?.location.origin ?? window.location.origin;
	const publicOrigin = resolveSnapshotPublicOrigin(captureOrigin);
	const captureHost = doc.querySelector("[data-assessment-print-capture-host]");
	const wrapper =
		captureHost?.querySelector("[data-assessment-print-page-wrapper]") ??
		doc.querySelector("[data-assessment-print-page-wrapper]") ??
		doc.querySelector("[data-assessment-print-root]");
	if (!wrapper) {
		throw new Error("Print page root not found in document.");
	}

	const sheetCount = wrapper.querySelectorAll("[data-print-page-sheet]").length;
	if (sheetCount < ASSESSMENT_REPORT_PRINT_TOTAL_PAGES) {
		throw new Error(
			`Print snapshot incomplete: expected ${ASSESSMENT_REPORT_PRINT_TOTAL_PAGES} pages, found ${sheetCount}.`,
		);
	}

	const clone = wrapper.cloneNode(true) as HTMLElement;
	clone.removeAttribute("style");
	if (clone instanceof HTMLElement) {
		clone.style.cssText = "";
	}
	const printRoot = clone.querySelector("[data-assessment-print-root]");
	if (printRoot) {
		printRoot.setAttribute("data-assessment-print-pdf", "true");
	}
	rewriteRootUrls(clone, captureOrigin);

	const inlinedCss = await collectInlinedStylesForSnapshot(doc, captureOrigin);

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${escapeHtmlAttr(publicOrigin)}/" />
  <style>${escapeStyleText(inlinedCss)}</style>
</head>
<body class="bg-white">
${clone.outerHTML}
</body>
</html>`;
}

export async function captureAssessmentPrintHtml(
	assessmentId: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const container = document.createElement("div");
		container.setAttribute("data-assessment-print-capture-mount", "");
		document.body.appendChild(container);
		const root = createRoot(container);

		const cleanup = () => {
			window.setTimeout(() => {
				root.unmount();
				container.remove();
			}, 0);
		};

		root.render(
			createElement(AssessmentReportPrintCaptureHost, {
				assessmentId,
				onCaptured: (html: string) => {
					cleanup();
					resolve(html);
				},
				onError: (err: Error) => {
					cleanup();
					reject(err);
				},
			}),
		);
	});
}
