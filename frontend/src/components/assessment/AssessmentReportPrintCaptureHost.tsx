import { useEffect, useRef } from "react";
import { AssessmentReportPrintShell } from "@/components";
import {
	ASSESSMENT_REPORT_PRINT,
	ASSESSMENT_REPORT_PRINT_TOTAL_PAGES,
} from "@/const";
import { buildAssessmentPrintHtmlSnapshot } from "@/lib";
import type { AssessmentReportPrintCaptureHostProps } from "@/types";

export function AssessmentReportPrintCaptureHost({
	assessmentId,
	onCaptured,
	onError,
}: AssessmentReportPrintCaptureHostProps) {
	const finishedRef = useRef(false);
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		finishedRef.current = false;
		window.__REPORT_RENDER_READY__ = false;
		const started = Date.now();
		const pollMs = ASSESSMENT_REPORT_PRINT.captureRenderReadyPollMs;
		const maxMs = ASSESSMENT_REPORT_PRINT.captureRenderReadyMaxMs;

		const isHostReady = () => {
			const host = hostRef.current;
			if (!host || window.__REPORT_RENDER_READY__ !== true) {
				return false;
			}
			const pages = host.querySelector("[data-assessment-print-pages]");
			const sheetCount = host.querySelectorAll(
				"[data-print-page-sheet]",
			).length;
			return pages != null && sheetCount >= ASSESSMENT_REPORT_PRINT_TOTAL_PAGES;
		};

		const tick = () => {
			if (finishedRef.current) {
				return;
			}
			if (isHostReady()) {
				finishedRef.current = true;
				void buildAssessmentPrintHtmlSnapshot(document)
					.then(onCaptured)
					.catch((err) => {
						onError(
							err instanceof Error
								? err
								: new Error(ASSESSMENT_REPORT_PRINT.captureSnapshotBuildError),
						);
					});
				return;
			}
			const errEl = hostRef.current?.querySelector(
				"[data-assessment-print-error]",
			);
			if (errEl?.textContent?.trim()) {
				finishedRef.current = true;
				onError(
					new Error(
						errEl.textContent.trim() ||
							ASSESSMENT_REPORT_PRINT.captureLayoutLoadError,
					),
				);
				return;
			}
			if (Date.now() - started >= maxMs) {
				finishedRef.current = true;
				onError(new Error(ASSESSMENT_REPORT_PRINT.captureRenderTimeoutError));
				return;
			}
			window.setTimeout(tick, pollMs);
		};

		tick();
	}, [assessmentId, onCaptured, onError]);

	return (
		<div
			ref={hostRef}
			data-assessment-print-capture-host
			aria-hidden
			style={{
				position: "fixed",
				left: "-9999px",
				top: 0,
				width: "877px",
				pointerEvents: "none",
				opacity: 0,
				overflow: "hidden",
			}}
		>
			<AssessmentReportPrintShell assessmentId={assessmentId} mode="capture" />
		</div>
	);
}
