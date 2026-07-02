import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { downloadBlobAsFile } from "@/api";
import {
	ASSESSMENT_REPORT_GENERATION,
	ASSESSMENT_REPORTS_BASE_URL,
	ROUTES,
} from "@/const";
import type {
	AssessmentDirectoryResultRow,
	AssessmentReportResultsLocationState,
	AssessmentReportResultsReturnTo,
} from "@/types";

function assessmentReportFilenameFromKey(normalizedKey: string): string {
	const segment = normalizedKey.split("/").pop()?.trim();
	if (segment && segment.length > 0) {
		return segment.replace(/[^\w.-]+/g, "_");
	}
	return "assessment-report.pdf";
}

export function navigateToAssessmentReportResults(
	navigate: NavigateFunction,
	row: AssessmentDirectoryResultRow,
	returnTo?: AssessmentReportResultsReturnTo,
): void {
	const reportKey = row.reportKey?.trim();
	const state: AssessmentReportResultsLocationState = {
		...(reportKey
			? {
					prefetchedReportResults: {
						reportKey,
						completedAt: row.completedAt,
					},
				}
			: {}),
		...(returnTo ? { returnTo } : {}),
	};

	navigate(ROUTES.assessment.reportResultsWithIdPath(row.id), {
		state: Object.keys(state).length > 0 ? state : undefined,
	});
}

export async function downloadAssessmentReport(
	reportKey: string | null | undefined,
): Promise<void> {
	const key = reportKey?.trim();
	if (!key) {
		return;
	}
	if (!ASSESSMENT_REPORTS_BASE_URL) {
		toast.error(ASSESSMENT_REPORT_GENERATION.missingDownloadBase);
		return;
	}
	const normalizedKey = key.replace(/^\//, "");
	const url = new URL(normalizedKey, window.location.origin).href;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			toast.error(ASSESSMENT_REPORT_GENERATION.downloadUrlError);
			return;
		}
		const blob = await res.blob();
		downloadBlobAsFile(blob, assessmentReportFilenameFromKey(normalizedKey));
	} catch {
		toast.error(ASSESSMENT_REPORT_GENERATION.downloadUrlError);
	}
}
