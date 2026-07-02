import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getReportContent } from "@/api";
import {
	AppLoader,
	BehavioralAssessment,
	BehaviorVsPersonality,
	BspColorModel,
	BspColorWheel,
	CommunicationEffectiveness,
	QuadrantStylePages,
	StressManagement,
	YourBehavioralStyle,
	YourNextSteps,
} from "@/components";
import { ASSESSMENT_REPORT_CONTENT_SECTIONS } from "@/const";
import { isApiError } from "@/lib";
import type {
	AssessmentReportResultsContentProps,
	ReportContentSectionKey,
	ReportContentSectionState,
} from "@/types";
import {
	mapBevspeInformationContent,
	mapIncreaseCommunicationContent,
	mapNextStepsContent,
	splitReportCopyParagraphs,
} from "@/utils";

function createIdleSectionState(): ReportContentSectionState {
	return { loadState: "idle", payload: null };
}

export function AssessmentReportResultsContent({
	welcomeDisplayName,
	onShare,
}: AssessmentReportResultsContentProps) {
	const sections = ASSESSMENT_REPORT_CONTENT_SECTIONS;
	const [sectionState, setSectionState] = useState<
		Record<ReportContentSectionKey, ReportContentSectionState>
	>(
		() =>
			Object.fromEntries(
				sections.map((section) => [section.key, createIdleSectionState()]),
			) as Record<ReportContentSectionKey, ReportContentSectionState>,
	);

	useEffect(() => {
		let cancelled = false;
		setSectionState(
			Object.fromEntries(
				sections.map((section) => [
					section.key,
					{ loadState: "loading", payload: null },
				]),
			) as Record<ReportContentSectionKey, ReportContentSectionState>,
		);

		void (async () => {
			const results = await Promise.allSettled(
				sections.map((section) => getReportContent(section.sectionKey)),
			);

			if (cancelled) {
				return;
			}

			const next = Object.fromEntries(
				sections.map((section, index) => {
					const result = results[index]!;

					if (result.status === "rejected") {
						toast.error(section.loadErrorMessage);
						return [
							section.key,
							{ loadState: "error", payload: null },
						] as const;
					}

					const res = result.value;
					if (isApiError(res)) {
						toast.error(section.loadErrorMessage);
						return [
							section.key,
							{ loadState: "error", payload: null },
						] as const;
					}

					return [section.key, { loadState: "ok", payload: res.data }] as const;
				}),
			) as Record<ReportContentSectionKey, ReportContentSectionState>;

			setSectionState(next);
		})();

		return () => {
			cancelled = true;
		};
	}, [sections]);

	const isLoading = useMemo(
		() =>
			sections.some(
				(section) => sectionState[section.key]?.loadState === "loading",
			),
		[sectionState, sections],
	);

	const getSection = (key: ReportContentSectionKey) => sectionState[key];

	const welcome = getSection("welcome");
	const colorInfo = getSection("colorInfo");
	const communication = getSection("communication");
	const decreaseStress = getSection("decreaseStress");
	const bevspe = getSection("bevspe");
	const nextSteps = getSection("nextSteps");

	const welcomeCopyRaw = welcome.payload?.content?.welcome_copy;
	const welcomeCopy = typeof welcomeCopyRaw === "string" ? welcomeCopyRaw : "";
	const welcomeParagraphs = splitReportCopyParagraphs(welcomeCopy);
	const colorLeftRaw = colorInfo.payload?.content?.cleftcontent;
	const colorRightRaw = colorInfo.payload?.content?.crightcontent;
	const colorLeftContent = typeof colorLeftRaw === "string" ? colorLeftRaw : "";
	const colorRightContent =
		typeof colorRightRaw === "string" ? colorRightRaw : "";

	const communicationContent = useMemo(
		() =>
			communication.payload
				? mapIncreaseCommunicationContent(communication.payload.content)
				: null,
		[communication.payload],
	);

	const behaviorVsPersonalityContent = useMemo(
		() =>
			bevspe.payload
				? mapBevspeInformationContent(bevspe.payload.content)
				: null,
		[bevspe.payload],
	);

	const nextStepsContent = useMemo(
		() =>
			nextSteps.payload ? mapNextStepsContent(nextSteps.payload.content) : null,
		[nextSteps.payload],
	);

	if (isLoading) {
		return <AppLoader className="py-16" />;
	}

	if (welcome.loadState !== "ok") {
		return null;
	}

	return (
		<>
			<BehavioralAssessment
				welcomeDisplayName={welcomeDisplayName}
				welcomeParagraphs={welcomeParagraphs}
			/>
			{colorInfo.loadState === "ok" ? (
				<BspColorModel
					cleftcontent={colorLeftContent}
					crightcontent={colorRightContent}
				/>
			) : null}
			<BspColorWheel />
			<YourBehavioralStyle />
			<QuadrantStylePages />
			{communication.loadState === "ok" && communicationContent ? (
				<CommunicationEffectiveness content={communicationContent} />
			) : null}
			{decreaseStress.loadState === "ok" && decreaseStress.payload?.content ? (
				<StressManagement
					decreaseStressContent={decreaseStress.payload.content}
				/>
			) : null}
			{bevspe.loadState === "ok" && behaviorVsPersonalityContent ? (
				<BehaviorVsPersonality content={behaviorVsPersonalityContent} />
			) : null}
			{nextSteps.loadState === "ok" && nextStepsContent ? (
				<YourNextSteps
					content={nextStepsContent}
					onShare={onShare ?? (() => {})}
				/>
			) : null}
		</>
	);
}
