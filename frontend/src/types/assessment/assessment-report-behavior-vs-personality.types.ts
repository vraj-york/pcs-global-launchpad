import type { ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY } from "@/const";
import type { RichTextPart } from "./assessment-report-rich-text.types";

export type BehaviorVsPersonalityPillKey =
	keyof typeof ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY.pills;

export type BehaviorVsPersonalityPillIconKey =
	(typeof ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY.pills)[BehaviorVsPersonalityPillKey]["icon"];

export type BehaviorVsPersonalityPill = {
	title: string;
	description: string;
	icon: BehaviorVsPersonalityPillIconKey;
	surfaceClassName: string;
	iconButtonClassName: string;
};

export type BehaviorVsPersonalityParagraph = {
	parts: RichTextPart[];
};

export type BehaviorVsPersonalityContent = {
	title: string;
	dsc1Paragraphs: BehaviorVsPersonalityParagraph[];
	dsc2Parts: RichTextPart[];
	pills: typeof ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY.pills;
};

export type BehaviorVsPersonalityProps = {
	content: BehaviorVsPersonalityContent;
	variant?: "default" | "print";
};

export type BehaviorVsPersonalityDescriptionsCardProps = {
	paragraphs: BehaviorVsPersonalityParagraph[];
	variant?: "default" | "print";
};

export type BehaviorVsPersonalitySummaryCardProps = {
	parts: RichTextPart[];
	variant?: "default" | "print";
};

export type BehaviorVsPersonalityPillProps = {
	pill: BehaviorVsPersonalityPill;
	variant?: "default" | "print";
};
