import type { ASSESSMENT_REPORT_COMMUNICATION_CARD_ORDER } from "@/const";

export type ParsedCommunicationCardBody = {
	header: string;
	bullets: string[];
};

export type CommunicationEffectivenessColorKey =
	(typeof ASSESSMENT_REPORT_COMMUNICATION_CARD_ORDER)[number];

export type CommunicationColorCardData = {
	header: string;
	bullets: string[];
	/** Resolved ``icred_img`` / ``icgreen_img`` / ``icgray_img`` (S3 or absolute URL). */
	thumbnailUrl: string | null;
	/** Parsed from ``icred_youtube_link`` / ``icgreen_youtube_link`` / ``icgray_youtube_link`` (watch or embed URL). */
	youtubeVideoId: string | null;
};

export type CommunicationEffectivenessContent = {
	icdetails: string;
	gray: CommunicationColorCardData;
	green: CommunicationColorCardData;
	red: CommunicationColorCardData;
};

export type CommunicationEffectivenessProps = {
	content: CommunicationEffectivenessContent;
	variant?: "default" | "print";
};

export type CommunicationColorCardProps = {
	colorKey: CommunicationEffectivenessColorKey;
	header: string;
	bullets: string[];
	thumbnailUrl: string | null;
	youtubeVideoId: string | null;
	variant?: "default" | "print";
};
