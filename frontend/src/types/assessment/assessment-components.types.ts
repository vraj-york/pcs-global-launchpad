export type AssessmentInstructionsContentProps = {
	onExit: () => void;
	onBackToIntro: () => void;
	onStartAssessment: () => void;
	hasInProgressSession: boolean;
};

export type AssessmentIntroContentProps = {
	onExit: () => void;
	onContinueToInstructions: () => void;
};

export type AssessmentLikertQuestionBlockProps = {
	instanceId: string;
	questionNumber: number;
	questionText: string;
	statements: readonly [string, string, string, string] | string[];
	selections: (number | null)[];
	onScoreSelect: (rowIndex: number, value: number) => void;
	padScaleEnd?: boolean;
};

export type DemoNoteWarningProps = {
	title?: string;
	body: string;
	noteId: string;
};

export type AssessmentCompleteContentProps = {
	assessmentId: string;
};

export type AssessmentCompleteUiPhase =
	| "summary"
	| "ftue-welcome"
	| "generating"
	| "ftue-reveal"
	| "error";

export type AssessmentFtueWelcomeContentProps = {
	onSeeMyBlueprint: () => void;
	isGenerating: boolean;
};

export type AssessmentFtueStyleRevealContentProps = {
	assessmentId: string;
	reportKey: string | null;
	onDownload: () => void;
	isDownloading?: boolean;
	onContinueToDashboard: () => void;
};
