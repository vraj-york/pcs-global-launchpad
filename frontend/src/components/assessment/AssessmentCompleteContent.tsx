import { ArrowLeft, CircleCheck, CircleCheckBig, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	AssessmentFtueStyleRevealContent,
	AssessmentFtueWelcomeContent,
	AssessmentReportStatusFlow,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENT_COMPLETION,
	ASSESSMENT_COMPLETION_OVERVIEW_STATS,
	ASSESSMENT_COMPLETION_SECTION_ROW,
	ASSESSMENT_QUESTIONS_PER_SECTION,
	ASSESSMENT_REPORT_GENERATION,
	ASSESSMENT_REPORT_INTERSTITIAL_STEP_INDEX,
	ASSESSMENT_REPORT_LAST_PROGRESS_STEP_INDEX,
	ASSESSMENT_REPORT_MAX_WAIT_MS,
	ASSESSMENT_REPORT_MIN_LOADER_MS,
	ASSESSMENT_REPORT_STEP_ROTATE_MS,
	ASSESSMENT_SESSION,
	ROUTES,
	SKIP_ASSESSMENT_PERSISTENCE_APIS,
} from "@/const";
import { captureAssessmentCompleted, cn, isApiError } from "@/lib";
import { useAssessmentStore, useUsersStore } from "@/store";
import type {
	AssessmentCompleteContentProps,
	AssessmentCompleteUiPhase,
} from "@/types";
import { downloadAssessmentReport, runClientHtmlReportPipeline } from "@/utils";

export function AssessmentCompleteContent({
	assessmentId,
}: AssessmentCompleteContentProps) {
	const navigate = useNavigate();
	const enqueueAssessmentScoring = useAssessmentStore(
		(s) => s.enqueueAssessmentScoring,
	);
	const getAssessment = useAssessmentStore((s) => s.getAssessment);
	const updateAssessment = useAssessmentStore((s) => s.updateAssessment);
	const { userProfile, userProfileLoading, fetchUserProfile } = useUsersStore();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uiPhase, setUiPhase] = useState<AssessmentCompleteUiPhase>("summary");
	const [rotatingStepIndex, setRotatingStepIndex] = useState(0);
	const [reportKey, setReportKey] = useState<string | null>(null);
	const [reportBackendReady, setReportBackendReady] = useState(false);
	const [pollToken, setPollToken] = useState(0);
	const [isDownloading, setIsDownloading] = useState(false);
	const generatingStartedAtRef = useRef<number | null>(null);
	const isFtueReportFlowRef = useRef(false);

	const showFtueFlow = useMemo(() => {
		if (SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			return false;
		}
		if (userProfileLoading && !userProfile) {
			return null;
		}
		if (!userProfile) {
			return false;
		}
		return userProfile.assessmentCompletionCount === 0;
	}, [userProfile, userProfileLoading]);

	useEffect(() => {
		if (SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			return;
		}
		void fetchUserProfile();
	}, [fetchUserProfile]);

	const handleDownload = useCallback(async () => {
		if (isDownloading) {
			return;
		}
		setIsDownloading(true);
		try {
			await downloadAssessmentReport(reportKey);
		} finally {
			setIsDownloading(false);
		}
	}, [isDownloading, reportKey]);

	const handleRetry = useCallback(() => {
		setReportKey(null);
		setReportBackendReady(false);
		generatingStartedAtRef.current = Date.now();
		setPollToken((t) => t + 1);
		setUiPhase("generating");
	}, []);

	const handleReturnToDashboard = useCallback(() => {
		navigate(ROUTES.dashboard.root);
	}, [navigate]);

	useEffect(() => {
		if (uiPhase !== "generating" || !reportBackendReady || !reportKey) {
			return;
		}
		if (!isFtueReportFlowRef.current) {
			return;
		}
		void fetchUserProfile();
	}, [uiPhase, reportBackendReady, reportKey, fetchUserProfile]);

	useEffect(() => {
		if (uiPhase !== "generating") {
			return;
		}
		const id = window.setInterval(() => {
			setRotatingStepIndex((i) => {
				if (i < ASSESSMENT_REPORT_LAST_PROGRESS_STEP_INDEX) {
					return i + 1;
				}
				if (
					i === ASSESSMENT_REPORT_LAST_PROGRESS_STEP_INDEX &&
					reportBackendReady
				) {
					return ASSESSMENT_REPORT_INTERSTITIAL_STEP_INDEX;
				}
				return i;
			});
		}, ASSESSMENT_REPORT_STEP_ROTATE_MS);
		return () => window.clearInterval(id);
	}, [uiPhase, pollToken, reportBackendReady]);

	useEffect(() => {
		if (uiPhase !== "generating" || !reportBackendReady || !reportKey) {
			return;
		}
		if (rotatingStepIndex < ASSESSMENT_REPORT_INTERSTITIAL_STEP_INDEX) {
			return;
		}
		const startedAt = generatingStartedAtRef.current ?? Date.now();
		const minRemaining = Math.max(
			0,
			ASSESSMENT_REPORT_MIN_LOADER_MS - (Date.now() - startedAt),
		);
		const delay = Math.max(ASSESSMENT_REPORT_STEP_ROTATE_MS, minRemaining);
		const id = window.setTimeout(() => {
			if (isFtueReportFlowRef.current) {
				isFtueReportFlowRef.current = false;
				void (async () => {
					await fetchUserProfile();
					setUiPhase("ftue-reveal");
				})();
				return;
			}
			navigate(ROUTES.assessment.reportResultsWithIdPath(assessmentId), {
				replace: true,
				state: { triggerCoaching: true },
			});
		}, delay);
		return () => window.clearTimeout(id);
	}, [
		assessmentId,
		navigate,
		uiPhase,
		reportBackendReady,
		reportKey,
		rotatingStepIndex,
		fetchUserProfile,
	]);

	useEffect(() => {
		if (uiPhase !== "generating" || SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			return;
		}
		const signal = { cancelled: false };

		const resolveGetAssessment = async (id: string) => {
			const res = await getAssessment(id);
			if (isApiError(res)) {
				return { ok: false as const, message: res.message };
			}
			return { ok: true as const, data: res.data };
		};

		void runClientHtmlReportPipeline(
			assessmentId,
			resolveGetAssessment,
			ASSESSMENT_REPORT_MAX_WAIT_MS,
			signal,
		).then((result) => {
			if (signal.cancelled) {
				return;
			}
			if (result.ok) {
				setReportKey(result.reportKey);
				setReportBackendReady(true);
				return;
			}
			toast.error(result.message);
			setUiPhase("error");
		});

		return () => {
			signal.cancelled = true;
		};
	}, [assessmentId, getAssessment, uiPhase, pollToken]);

	const handleReviewAnswers = useCallback(() => {
		if (!assessmentId) {
			toast.error(ASSESSMENT_COMPLETION.reviewMissingSession);
			return;
		}
		navigate(ROUTES.assessment.root, {
			state: { reviewAssessmentId: assessmentId, editAnswers: true },
		});
	}, [assessmentId, navigate]);

	const markAssessmentCompleted = useCallback(async (): Promise<boolean> => {
		if (SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			return true;
		}
		const res = await updateAssessment(assessmentId, {
			status: "completed",
		});
		if (isApiError(res)) {
			toast.error(ASSESSMENT_SESSION.finishMarkCompleteError);
			return false;
		}
		return true;
	}, [assessmentId, updateAssessment]);

	const startReportGeneration = useCallback(async () => {
		if (isSubmitting) {
			return;
		}
		if (SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			navigate(ROUTES.dashboard.root);
			return;
		}
		setIsSubmitting(true);
		const marked = await markAssessmentCompleted();
		if (!marked) {
			setIsSubmitting(false);
			return;
		}
		const res = await enqueueAssessmentScoring(assessmentId);
		setIsSubmitting(false);
		if (isApiError(res)) {
			toast.error(ASSESSMENT_COMPLETION.enqueueReportError);
			return;
		}
		captureAssessmentCompleted({ assessment_id: assessmentId });
		if (!res.data.enqueued) {
			const fresh = await getAssessment(assessmentId);
			if (
				!isApiError(fresh) &&
				fresh.data.status === "report_generated" &&
				fresh.data.report_key
			) {
				setReportKey(fresh.data.report_key);
				setReportBackendReady(true);
				generatingStartedAtRef.current = Date.now();
				setRotatingStepIndex(0);
				setUiPhase("generating");
				return;
			}
		}
		setRotatingStepIndex(0);
		setReportKey(null);
		setReportBackendReady(false);
		generatingStartedAtRef.current = Date.now();
		setUiPhase("generating");
	}, [
		assessmentId,
		enqueueAssessmentScoring,
		getAssessment,
		isSubmitting,
		markAssessmentCompleted,
		navigate,
	]);

	const handleSubmitReport = useCallback(async () => {
		if (showFtueFlow) {
			setUiPhase("ftue-welcome");
			return;
		}
		await startReportGeneration();
	}, [showFtueFlow, startReportGeneration]);

	const handleSeeMyBlueprint = useCallback(async () => {
		isFtueReportFlowRef.current = true;
		await startReportGeneration();
	}, [startReportGeneration]);

	const statusFlowPhase: "generating" | "error" =
		uiPhase === "error" ? "error" : "generating";

	if (uiPhase === "ftue-welcome") {
		return (
			<AssessmentFtueWelcomeContent
				onSeeMyBlueprint={() => {
					void handleSeeMyBlueprint();
				}}
				isGenerating={isSubmitting}
			/>
		);
	}

	if (uiPhase === "ftue-reveal") {
		return (
			<AssessmentFtueStyleRevealContent
				assessmentId={assessmentId}
				reportKey={reportKey}
				onDownload={handleDownload}
				isDownloading={isDownloading}
				onContinueToDashboard={handleReturnToDashboard}
			/>
		);
	}

	if (uiPhase !== "summary") {
		return (
			<div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
				<div className="flex min-h-[min(100%,calc(100svh-10rem))] flex-1 flex-col items-center justify-center py-10 md:min-h-[min(100%,calc(100svh-9rem))] md:py-16">
					<AssessmentReportStatusFlow
						phase={statusFlowPhase}
						rotatingStepIndex={rotatingStepIndex}
						onRetry={handleRetry}
						onReturnToDashboard={handleReturnToDashboard}
						returnCtaLabel={ASSESSMENT_REPORT_GENERATION.returnToDashboardCta}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 pb-8">
			<div className="flex w-full flex-col items-center gap-5 text-center">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-interactive-success p-4 text-light-same"
					aria-hidden
				>
					<CircleCheck className="size-12 shrink-0" strokeWidth={1.5} />
				</div>
				<div className="flex max-w-2xl flex-col items-center gap-4">
					<h1 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{ASSESSMENT_COMPLETION.title}
					</h1>
					<p className="text-balance text-regular font-normal leading-regular text-text-secondary">
						{ASSESSMENT_COMPLETION.subtitle}
					</p>
				</div>
			</div>

			<div className="flex w-full flex-col gap-4">
				<div className="flex flex-col gap-6 rounded-2xl border border-border bg-background p-6">
					<h2 className="text-left text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{ASSESSMENT_COMPLETION.overviewTitle}
					</h2>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2.5">
							{ASSESSMENT_SESSION.sections.map((sec, i) => {
								const row = ASSESSMENT_COMPLETION_SECTION_ROW[i]!;
								return (
									<div
										key={sec.title}
										className={cn(
											"flex w-full items-center justify-between gap-6 rounded-xl px-3 py-2",
											row.shell,
										)}
									>
										<div
											className={cn(
												"flex min-w-0 items-center justify-center gap-3",
												row.label,
											)}
										>
											<CircleCheckBig
												className="size-4 shrink-0 fill-none"
												strokeWidth={1.5}
												aria-hidden
											/>
											<span className="text-small font-semibold leading-small">
												{sec.title}
											</span>
										</div>
										<span className="shrink-0 text-mini font-normal leading-mini text-muted-foreground">
											{ASSESSMENT_COMPLETION.questionsPerSectionLabel(
												ASSESSMENT_QUESTIONS_PER_SECTION,
											)}
										</span>
									</div>
								);
							})}
						</div>
						<div
							className="h-px w-full bg-border"
							role="presentation"
							aria-hidden
						/>
						<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
							{ASSESSMENT_COMPLETION_OVERVIEW_STATS.map((t) => (
								<div
									key={t.label}
									className="flex flex-col gap-1 rounded-xl bg-brand-gray-bg px-4 py-3"
								>
									<p className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
										{t.value}
									</p>
									<p className="text-mini font-normal leading-mini text-muted-foreground">
										{t.label}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-4 rounded-2xl border border-info bg-info-bg p-6">
					<h2 className="text-left text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{ASSESSMENT_COMPLETION.whatNextTitle}
					</h2>
					<ol className="flex list-none flex-col gap-3 px-1">
						{ASSESSMENT_COMPLETION.whatNext.map((line, i) => (
							<li key={line} className="flex items-start gap-2.5">
								<span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-info px-1.5 text-mini font-semibold leading-none text-light-same">
									{i + 1}
								</span>
								<p className="min-w-0 flex-1 text-left text-small font-normal leading-small text-text-secondary">
									{line}
								</p>
							</li>
						))}
					</ol>
				</div>
			</div>

			<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="shrink-0 rounded-xl sm:w-auto"
					icon={ArrowLeft}
					onClick={() => {
						handleReviewAnswers();
					}}
					disabled={isSubmitting}
				>
					{ASSESSMENT_COMPLETION.reviewAnswers}
				</Button>
				<Button
					type="button"
					size="lg"
					className="flex-1 rounded-xl"
					icon={showFtueFlow ? CircleCheck : Sparkles}
					isLoading={isSubmitting}
					onClick={() => {
						void handleSubmitReport();
					}}
					disabled={showFtueFlow === null}
				>
					{showFtueFlow
						? ASSESSMENT_COMPLETION.submitAssessment
						: ASSESSMENT_COMPLETION.submitReport}
				</Button>
			</div>
		</div>
	);
}
