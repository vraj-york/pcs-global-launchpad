type Uuid = string;

export type AssessmentStatus =
	| "in_progress"
	| "completed"
	| "scored"
	| "report_generated";

export type ApiAssessment = {
	id: Uuid;
	user_id: string;
	status: AssessmentStatus;
	started_at: string;
	completed_at: string | null;
	/** Present when GET includes joined assessment_reports row. */
	report_key?: string | null;
};

export type ApiEnqueueScoringResponse = {
	enqueued: boolean;
	message?: string | null;
};

export type ApiUploadPrintHtmlResponse = {
	print_html_s3_key: string;
};

export type ApiEnqueueReportResponse = {
	enqueued: boolean;
	message?: string | null;
};

export type OptionColor = "red" | "green" | "blue" | "grey";

export type ApiQuestionOption = {
	id: Uuid;
	question_id: Uuid;
	option_key: string;
	color: OptionColor;
	option_text: string;
	display_order: number;
	created_at: string;
};

export type QuestionTypeKey =
	| "environmental_preferences"
	| "interaction_preferences"
	| "character_strengths_distressors";

export type ApiQuestionWithOptions = {
	id: Uuid;
	question_text: string;
	type: QuestionTypeKey;
	situation: "typical" | "stressful";
	life_context: "professional" | "personal";
	question_order: number;
	version: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	options: ApiQuestionOption[];
};

export type ApiQuestionResponseItem = {
	option_id: Uuid;
	value: number;
};

export type ApiQuestionResponseOut = {
	id: Uuid;
	assessment_id: Uuid;
	option_id: Uuid;
	value: number;
	created_at: string;
	updated_at: string;
};

export type ApiReportContentResponse = {
	section_key: string;
	content: Record<string, unknown>;
};
