import { ASSESSMENT_REPORT_IMAGES_BASE_URL, ROUTES } from "@/const";
import type {
	BuildYoutubeUrlOptions,
	YoutubeLinkType,
	YoutubeThumbnailQuality,
} from "@/types";

/** Normalize CMS / report_content text into paragraph blocks. */
export function splitReportCopyParagraphs(text: string | undefined): string[] {
	if (!text?.trim()) {
		return [];
	}
	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	if (/\n\n/.test(normalized)) {
		return normalized
			.split(/\n\n+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return normalized
		.split(/\n\s*/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);
}

export function readReportContentString(
	content: Record<string, unknown>,
	key: string,
): string {
	const value = content[key];
	return typeof value === "string" ? value.trim() : "";
}

/** Resolve ``static/images/…`` paths from report_content (S3 images base). */
export function resolveAssessmentReportImageUrl(
	path: string | undefined | null,
): string | null {
	const raw = path?.trim();
	if (!raw) {
		return null;
	}
	if (/^https?:\/\//i.test(raw)) {
		return raw;
	}
	const base = ASSESSMENT_REPORT_IMAGES_BASE_URL.replace(/\/$/, "");
	if (!base) {
		return null;
	}
	const relative = raw.replace(/^static\/images\//, "").replace(/^\/+/, "");
	return `${base}/${relative}`;
}

export function buildYoutubeUrl(
	videoId: string,
	type: YoutubeLinkType,
	options: BuildYoutubeUrlOptions = {},
): string {
	const id = videoId.trim();

	switch (type) {
		case "watch":
			return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
		case "embed": {
			const params = new URLSearchParams({
				rel: "0",
				...(options.autoplay ? { autoplay: "1" } : {}),
			});
			return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
		}
		case "thumbnail": {
			const quality: YoutubeThumbnailQuality = options.quality ?? "hqdefault";
			return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
		}
	}
}

export function parseYoutubeVideoId(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	if (/^[\w-]{11}$/.test(trimmed)) {
		return trimmed;
	}

	try {
		const parsed = new URL(
			/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
		);
		const host = parsed.hostname.replace(/^www\./, "");

		if (host === "youtu.be") {
			const id = parsed.pathname.replace(/^\//, "").split("/")[0];
			return id || null;
		}

		if (host === "youtube.com") {
			if (parsed.pathname === "/watch") {
				return parsed.searchParams.get("v");
			}

			if (parsed.pathname.startsWith("/embed/")) {
				return parsed.pathname.split("/")[2] ?? null;
			}
		}
	} catch {
		return null;
	}

	return null;
}

const YOUTUBE_THUMBNAIL_IMG_SELECTOR = 'img[src*="img.youtube.com"]';

/** Absolute URL that opens the share modal on the assessment results route (PDF-safe link). */
export function buildAssessmentShareReportHref(
	assessmentId: string,
	origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string | undefined {
	const safeId = assessmentId.trim();
	if (!safeId || !origin) {
		return undefined;
	}
	const path = ROUTES.assessment.reportResultsWithIdPath(safeId);
	return `${origin.replace(/\/$/, "")}${path}?share=1`;
}

export function areYoutubePrintThumbnailsSettled(
	root: ParentNode = document,
): boolean {
	const imgs = root.querySelectorAll<HTMLImageElement>(
		YOUTUBE_THUMBNAIL_IMG_SELECTOR,
	);
	if (imgs.length === 0) {
		return true;
	}
	return Array.from(imgs).every((img) => img.complete);
}
