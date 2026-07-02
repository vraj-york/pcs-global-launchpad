import type { ReactNode } from "react";
import type { ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS } from "@/const";
import type { ApiAssessment } from "./assessment.types";
import type { BspColorWheelStaticSectionId } from "./bsp-color-wheel-static.types";

export type AssessmentReportPrintPageKey =
	(typeof ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS)[number]["key"];

export type AssessmentReportPrintPage = {
	key: AssessmentReportPrintPageKey;
	label: string;
	pageNumber: number;
};

export type AssessmentReportPrintLayoutProps = {
	pageNumber: number;
	totalPages?: number;
	children: ReactNode;
	className?: string;
};

export type AssessmentReportPrintBodyProps = {
	welcomeDisplayName: string;
	onShare?: () => void;
	shareReportHref?: string;
};

export type AssessmentReportPrintRouteParams = {
	assessmentId?: string;
};

export type AssessmentReportPrintIntroPageOneProps = {
	welcomeDisplayName: string;
	welcomeParagraphs: string[];
};

export type AssessmentReportPrintSectionHostProps = {
	children: ReactNode;
	className?: string;
};

export type AssessmentReportPrintColorWheelPageProps = {
	pageNumber: number;
	sectionId: BspColorWheelStaticSectionId;
	title?: string;
	subtitle?: string;
};

export type AssessmentReportPrintShellMode = "preview" | "capture";

export type AssessmentReportPrintShellProps = {
	assessmentId: string;
	mode: AssessmentReportPrintShellMode;
	onShare?: () => void;
};

export type AssessmentReportPrintCaptureHostProps = {
	assessmentId: string;
	onCaptured: (html: string) => void;
	onError: (error: Error) => void;
};

export type ClientHtmlReportPipelineResult =
	| { ok: true; reportKey: string }
	| { ok: false; message: string };

export type ClientHtmlReportPipelineGetAssessment = (
	assessmentId: string,
) => Promise<
	{ ok: true; data: ApiAssessment } | { ok: false; message?: string }
>;

declare global {
	interface Window {
		__REPORT_RENDER_READY__?: boolean;
	}
}
