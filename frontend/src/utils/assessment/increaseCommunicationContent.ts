import { ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS } from "@/const";
import type {
	CommunicationEffectivenessContent,
	ParsedCommunicationCardBody,
} from "@/types";
import {
	buildYoutubeUrl,
	parseYoutubeVideoId,
	readReportContentString,
	resolveAssessmentReportImageUrl,
} from "./assessmentReport.utils";

export function parseCommunicationCardBody(
	body: string,
): ParsedCommunicationCardBody {
	const lines = body
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return { header: "", bullets: [] };
	}

	return {
		header: lines[0],
		bullets: lines.slice(1),
	};
}

export function mapIncreaseCommunicationContent(
	content: Record<string, unknown>,
): CommunicationEffectivenessContent {
	const mapCard = (bodyKey: string, imageKey: string, youtubeKey: string) => {
		const body = readReportContentString(content, bodyKey);
		const { header, bullets } = parseCommunicationCardBody(body);
		const youtubeRaw = readReportContentString(content, youtubeKey);
		const youtubeVideoId =
			youtubeRaw.length > 0 ? parseYoutubeVideoId(youtubeRaw) : null;
		const cmsThumbnail = resolveAssessmentReportImageUrl(
			readReportContentString(content, imageKey) || undefined,
		);
		const youtubeThumbnail = youtubeVideoId
			? buildYoutubeUrl(youtubeVideoId, "thumbnail")
			: null;

		return {
			header,
			bullets,
			thumbnailUrl: youtubeThumbnail ?? cmsThumbnail,
			youtubeVideoId,
		};
	};

	const keys = ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS;

	return {
		icdetails: readReportContentString(content, keys.icdetailsKey),
		gray: mapCard(
			keys.bodyKeys.gray,
			keys.imageKeys.gray,
			keys.youtubeLinkKeys.gray,
		),
		green: mapCard(
			keys.bodyKeys.green,
			keys.imageKeys.green,
			keys.youtubeLinkKeys.green,
		),
		red: mapCard(
			keys.bodyKeys.red,
			keys.imageKeys.red,
			keys.youtubeLinkKeys.red,
		),
	};
}
