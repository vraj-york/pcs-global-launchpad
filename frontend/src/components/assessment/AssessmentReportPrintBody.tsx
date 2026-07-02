import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getReportContent } from "@/api";
import {
	AssessmentReportPrintColorModelPage,
	AssessmentReportPrintColorWheelPage,
	AssessmentReportPrintIntroPageOne,
	AssessmentReportPrintIntroPageTwo,
	AssessmentReportPrintLayout,
	AssessmentReportPrintOverallStylePages,
	AssessmentReportPrintSectionHost,
	BehaviorVsPersonality,
	CommunicationEffectiveness,
	ContextStyleSection,
	StressManagement,
	useUserAssessmentStylesContext,
	YourNextSteps,
} from "@/components";
import {
	ASSESSMENT_REPORT_COLOR_WHEEL,
	ASSESSMENT_REPORT_CONTENT_SECTIONS,
	ASSESSMENT_REPORT_PRINT,
	ASSESSMENT_REPORT_PRINT_CONTEXT_PAGES,
	ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS,
} from "@/const";
import { isApiError } from "@/lib";
import type {
	AssessmentReportPrintBodyProps,
	ReportContentSectionKey,
	ReportContentSectionState,
} from "@/types";
import {
	areYoutubePrintThumbnailsSettled,
	mapBevspeInformationContent,
	mapIncreaseCommunicationContent,
	mapNextStepsContent,
	splitReportCopyParagraphs,
} from "@/utils";

function createIdleSectionState(): ReportContentSectionState {
	return { loadState: "idle", payload: null };
}

export function AssessmentReportPrintBody({
	welcomeDisplayName,
	onShare,
	shareReportHref,
}: AssessmentReportPrintBodyProps) {
	const sections = ASSESSMENT_REPORT_CONTENT_SECTIONS;
	const { loadState: stylesLoadState, styles } =
		useUserAssessmentStylesContext();
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
						return [
							section.key,
							{ loadState: "error", payload: null },
						] as const;
					}

					const res = result.value;
					if (isApiError(res)) {
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

	const isContentLoading = useMemo(
		() =>
			sections.some(
				(section) => sectionState[section.key]?.loadState === "loading",
			),
		[sectionState, sections],
	);

	const isStylesLoading =
		stylesLoadState === "idle" ||
		stylesLoadState === "loading" ||
		(stylesLoadState === "ok" && !styles);

	const isLoading = isContentLoading || isStylesLoading;

	const getSection = (key: ReportContentSectionKey) => sectionState[key];

	const welcome = getSection("welcome");
	const colorInfo = getSection("colorInfo");
	const communication = getSection("communication");
	const decreaseStress = getSection("decreaseStress");
	const bevspe = getSection("bevspe");
	const nextSteps = getSection("nextSteps");

	const canRenderPages = welcome.loadState === "ok" && styles != null;

	const [youtubeThumbnailsReady, setYoutubeThumbnailsReady] = useState(false);

	useEffect(() => {
		if (isLoading || !canRenderPages) {
			setYoutubeThumbnailsReady(false);
			return;
		}

		let cancelled = false;

		const syncCheck = () => {
			if (cancelled) {
				return;
			}
			if (areYoutubePrintThumbnailsSettled()) {
				setYoutubeThumbnailsReady(true);
			}
		};

		const attachLoadListeners = () => {
			const imgs = document.querySelectorAll<HTMLImageElement>(
				'img[src*="img.youtube.com"]',
			);
			for (const img of imgs) {
				if (!img.complete) {
					img.addEventListener("load", syncCheck);
					img.addEventListener("error", syncCheck);
				}
			}
			syncCheck();
		};

		const frameId = requestAnimationFrame(() => {
			requestAnimationFrame(attachLoadListeners);
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(frameId);
			const imgs = document.querySelectorAll<HTMLImageElement>(
				'img[src*="img.youtube.com"]',
			);
			for (const img of imgs) {
				img.removeEventListener("load", syncCheck);
				img.removeEventListener("error", syncCheck);
			}
		};
	}, [isLoading, canRenderPages]);

	const isRenderReady = !isLoading && canRenderPages && youtubeThumbnailsReady;

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.__REPORT_RENDER_READY__ = isRenderReady;
		return () => {
			window.__REPORT_RENDER_READY__ = false;
		};
	}, [isRenderReady]);

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
		return (
			<div
				className="flex min-h-48 items-center justify-center print:hidden"
				role="status"
				aria-live="polite"
				aria-busy
			>
				<Loader2
					className="size-8 animate-spin text-text-secondary"
					aria-hidden
				/>
				<span className="sr-only">{ASSESSMENT_REPORT_PRINT.loadingLabel}</span>
			</div>
		);
	}

	if (!canRenderPages) {
		const welcomeStatus = welcome.loadState;
		const stylesStatus = styles ? "ok" : stylesLoadState;

		return (
			<div
				className="mx-auto max-w-lg rounded-lg border border-border bg-background p-6 text-center shadow-sm"
				data-assessment-print-error
				role="alert"
			>
				<p className="text-heading-4 font-semibold text-text-primary">
					{ASSESSMENT_REPORT_PRINT.loadFailedTitle}
				</p>
				<p className="mt-2 text-small text-text-secondary">
					{ASSESSMENT_REPORT_PRINT.loadFailedBody}
				</p>
				<ul className="mt-4 space-y-1 text-left text-small text-text-secondary">
					<li>
						{ASSESSMENT_REPORT_PRINT.loadFailedWelcomeLabel}: {welcomeStatus}
					</li>
					<li>
						{ASSESSMENT_REPORT_PRINT.loadFailedStylesLabel}: {stylesStatus}
					</li>
				</ul>
			</div>
		);
	}

	return (
		<div
			className="flex w-full flex-col items-center gap-8 print:w-full print:items-center print:gap-0 print:bg-white print:[print-color-adjust:exact]"
			data-assessment-print-pages
		>
			<AssessmentReportPrintIntroPageOne
				welcomeDisplayName={welcomeDisplayName}
				welcomeParagraphs={welcomeParagraphs}
			/>
			<AssessmentReportPrintIntroPageTwo />

			{colorInfo.loadState === "ok" ? (
				<AssessmentReportPrintColorModelPage
					cleftcontent={colorLeftContent}
					crightcontent={colorRightContent}
				/>
			) : null}

			<AssessmentReportPrintColorWheelPage
				pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.colorWheelQuadrant}
				sectionId="quadrant"
				title={ASSESSMENT_REPORT_COLOR_WHEEL.sectionTitle}
				subtitle={ASSESSMENT_REPORT_COLOR_WHEEL.sectionSubtitle}
			/>

			<AssessmentReportPrintColorWheelPage
				pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.colorWheelColor}
				sectionId="color"
			/>

			<AssessmentReportPrintColorWheelPage
				pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.colorWheelStyleInfo}
				sectionId="styleInfo"
			/>

			<AssessmentReportPrintOverallStylePages />

			{ASSESSMENT_REPORT_PRINT_CONTEXT_PAGES.map(
				({ pageKey, contextKey, printPart }) => (
					<AssessmentReportPrintLayout
						key={pageKey}
						pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS[pageKey]}
					>
						<AssessmentReportPrintSectionHost>
							<ContextStyleSection
								contextKey={contextKey}
								styles={styles}
								printPart={printPart}
							/>
						</AssessmentReportPrintSectionHost>
					</AssessmentReportPrintLayout>
				),
			)}

			{communication.loadState === "ok" && communicationContent ? (
				<AssessmentReportPrintLayout
					pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.communication}
				>
					<AssessmentReportPrintSectionHost>
						<CommunicationEffectiveness
							content={communicationContent}
							variant="print"
						/>
					</AssessmentReportPrintSectionHost>
				</AssessmentReportPrintLayout>
			) : null}

			{decreaseStress.loadState === "ok" && decreaseStress.payload?.content ? (
				<AssessmentReportPrintLayout
					pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.stress}
				>
					<AssessmentReportPrintSectionHost className="[&_section]:gap-2 [&_h2]:text-heading-3 [&_h2]:leading-heading-3 [&_h2]:tracking-heading-3">
						<StressManagement
							decreaseStressContent={decreaseStress.payload.content}
							variant="print"
						/>
					</AssessmentReportPrintSectionHost>
				</AssessmentReportPrintLayout>
			) : null}

			{bevspe.loadState === "ok" && behaviorVsPersonalityContent ? (
				<AssessmentReportPrintLayout
					pageNumber={
						ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.behaviorVsPersonality
					}
				>
					<AssessmentReportPrintSectionHost>
						<BehaviorVsPersonality
							content={behaviorVsPersonalityContent}
							variant="print"
						/>
					</AssessmentReportPrintSectionHost>
				</AssessmentReportPrintLayout>
			) : null}

			{nextSteps.loadState === "ok" && nextStepsContent ? (
				<AssessmentReportPrintLayout
					pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.nextSteps}
				>
					<AssessmentReportPrintSectionHost>
						<YourNextSteps
							content={nextStepsContent}
							onShare={onShare ?? (() => {})}
							variant="print"
							shareReportHref={shareReportHref}
						/>
					</AssessmentReportPrintSectionHost>
				</AssessmentReportPrintLayout>
			) : null}
		</div>
	);
}
