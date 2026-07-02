import {
	enqueueAssessmentReport,
	uploadAssessmentReportPrintHtml,
} from "@/api";
import {
	ASSESSMENT_REPORT_GENERATION,
	ASSESSMENT_REPORT_POLL_MS,
} from "@/const";
import { captureAssessmentPrintHtml, isApiError } from "@/lib";
import type {
	ClientHtmlReportPipelineGetAssessment,
	ClientHtmlReportPipelineResult,
} from "@/types";

async function pollUntilScored(
	assessmentId: string,
	getAssessment: ClientHtmlReportPipelineGetAssessment,
	deadlineMs: number,
	signal: { cancelled: boolean },
): Promise<
	| { ok: true; alreadyReport: string }
	| { ok: true; scored: true }
	| { ok: false; message: string }
> {
	const started = Date.now();
	while (!signal.cancelled && Date.now() - started < deadlineMs) {
		const res = await getAssessment(assessmentId);
		if (signal.cancelled) {
			return {
				ok: false,
				message: ASSESSMENT_REPORT_GENERATION.pipelineCancelled,
			};
		}
		if (!res.ok) {
			return {
				ok: false,
				message:
					res.message ??
					ASSESSMENT_REPORT_GENERATION.pipelineFailedAssessmentStatus,
			};
		}
		const { status, report_key: reportKey } = res.data;
		if (status === "report_generated" && reportKey) {
			return { ok: true, alreadyReport: reportKey };
		}
		if (status === "scored") {
			return { ok: true, scored: true };
		}
		await new Promise<void>((r) => {
			window.setTimeout(r, ASSESSMENT_REPORT_POLL_MS);
		});
	}
	return {
		ok: false,
		message: ASSESSMENT_REPORT_GENERATION.pipelineTimedOutScoring,
	};
}

async function pollUntilReportReady(
	assessmentId: string,
	getAssessment: ClientHtmlReportPipelineGetAssessment,
	deadlineMs: number,
	signal: { cancelled: boolean },
): Promise<ClientHtmlReportPipelineResult> {
	const started = Date.now();
	while (!signal.cancelled && Date.now() - started < deadlineMs) {
		const res = await getAssessment(assessmentId);
		if (signal.cancelled) {
			return {
				ok: false,
				message: ASSESSMENT_REPORT_GENERATION.pipelineCancelled,
			};
		}
		if (!res.ok) {
			return {
				ok: false,
				message:
					res.message ??
					ASSESSMENT_REPORT_GENERATION.pipelineFailedAssessmentStatus,
			};
		}
		const { status, report_key: reportKey } = res.data;
		if (status === "report_generated" && reportKey) {
			return { ok: true, reportKey };
		}
		await new Promise<void>((r) => {
			window.setTimeout(r, ASSESSMENT_REPORT_POLL_MS);
		});
	}
	return {
		ok: false,
		message: ASSESSMENT_REPORT_GENERATION.pipelineTimedOutPdf,
	};
}

export async function runClientHtmlReportPipeline(
	assessmentId: string,
	getAssessment: ClientHtmlReportPipelineGetAssessment,
	maxWaitMs: number,
	signal: { cancelled: boolean },
): Promise<ClientHtmlReportPipelineResult> {
	const scoredPhase = await pollUntilScored(
		assessmentId,
		getAssessment,
		maxWaitMs,
		signal,
	);
	if (!scoredPhase.ok) {
		return scoredPhase;
	}
	if ("alreadyReport" in scoredPhase) {
		return { ok: true, reportKey: scoredPhase.alreadyReport };
	}

	let html: string;
	try {
		html = await captureAssessmentPrintHtml(assessmentId);
	} catch (err) {
		const detail =
			err instanceof Error
				? err.message
				: ASSESSMENT_REPORT_GENERATION.printCaptureError;
		return {
			ok: false,
			message: detail || ASSESSMENT_REPORT_GENERATION.printCaptureError,
		};
	}
	if (signal.cancelled) {
		return {
			ok: false,
			message: ASSESSMENT_REPORT_GENERATION.pipelineCancelled,
		};
	}

	const uploadRes = await uploadAssessmentReportPrintHtml(assessmentId, html);
	if (signal.cancelled) {
		return {
			ok: false,
			message: ASSESSMENT_REPORT_GENERATION.pipelineCancelled,
		};
	}
	if (isApiError(uploadRes)) {
		return {
			ok: false,
			message:
				uploadRes.message ?? ASSESSMENT_REPORT_GENERATION.printUploadError,
		};
	}

	const enqueueRes = await enqueueAssessmentReport(
		assessmentId,
		uploadRes.data.print_html_s3_key,
	);
	if (signal.cancelled) {
		return {
			ok: false,
			message: ASSESSMENT_REPORT_GENERATION.pipelineCancelled,
		};
	}
	if (isApiError(enqueueRes)) {
		return {
			ok: false,
			message:
				enqueueRes.message ?? ASSESSMENT_REPORT_GENERATION.enqueueReportError,
		};
	}
	if (!enqueueRes.data.enqueued) {
		const fresh = await getAssessment(assessmentId);
		if (
			fresh.ok &&
			fresh.data.status === "report_generated" &&
			fresh.data.report_key
		) {
			return { ok: true, reportKey: fresh.data.report_key };
		}
	}

	const remainingMs = Math.max(30_000, maxWaitMs - ASSESSMENT_REPORT_POLL_MS);
	return pollUntilReportReady(assessmentId, getAssessment, remainingMs, signal);
}
