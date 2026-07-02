import type { ReportContentSectionConfig } from "@/types";
import { ASSESSMENT_REPORT_GENERATION } from "./assessment-report-generation.const";
import { ASSESSMENT_REPORT_VIEW } from "./assessment-report-view.const";

export const ASSESSMENT_REPORT_CONTENT_SECTIONS = [
	{
		key: "welcome",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.welcomeAndOverall,
		loadErrorMessage: ASSESSMENT_REPORT_GENERATION.welcomeIntroLoadError,
	},
	{
		key: "colorInfo",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.colorInfo,
		loadErrorMessage: ASSESSMENT_REPORT_GENERATION.colorInfoLoadError,
	},
	{
		key: "communication",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.increaseCommunication,
		loadErrorMessage:
			ASSESSMENT_REPORT_GENERATION.communicationEffectivenessLoadError,
	},
	{
		key: "decreaseStress",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.decreaseStress,
		loadErrorMessage: ASSESSMENT_REPORT_GENERATION.stressManagementLoadError,
	},
	{
		key: "bevspe",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.bevspeInformation,
		loadErrorMessage:
			ASSESSMENT_REPORT_GENERATION.behaviorVsPersonalityLoadError,
	},
	{
		key: "nextSteps",
		sectionKey: ASSESSMENT_REPORT_VIEW.sectionKeys.nextSteps,
		loadErrorMessage: ASSESSMENT_REPORT_GENERATION.nextStepsLoadError,
	},
] as const satisfies readonly ReportContentSectionConfig[];
