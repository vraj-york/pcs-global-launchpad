import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	AppLoader,
	AssessmentCompleteContent,
	AssessmentInstructionsContent,
	AssessmentIntroContent,
	AssessmentSessionContent,
} from "@/components";
import {
	ASSESSMENT_API_BASE_URL,
	ASSESSMENT_SESSION,
	ASSESSMENT_STATUS,
	ROUTES,
	SKIP_ASSESSMENT_PERSISTENCE_APIS,
} from "@/const";
import { AssessmentLayout } from "@/layout";
import { captureAssessmentStarted, isApiError } from "@/lib";
import {
	buildSessionResumeState,
	isAssessmentFullyAnswered,
} from "@/lib/assessmentSessionResume";
import { useAssessmentStore } from "@/store";
import type {
	ApiQuestionWithOptions,
	AssessmentPageLocalSession,
	AssessmentPageLocationState,
	AssessmentPageStep,
	LoadedAssessmentSession,
} from "@/types";

async function fetchLocalSessionForExistingAssessment(
	questions: ApiQuestionWithOptions[],
	assessmentId: string,
): Promise<LoadedAssessmentSession | null> {
	const { getQuestionResponses } = useAssessmentStore.getState();
	const respRes = await getQuestionResponses(assessmentId);
	if (isApiError(respRes)) {
		return null;
	}
	return {
		assessmentId,
		questions,
		sessionInitial: buildSessionResumeState(questions, respRes.data),
		persistedOptionIds: respRes.data.map((r) => r.option_id),
		allQuestionsAnswered: isAssessmentFullyAnswered(questions, respRes.data),
	};
}

async function tryLoadInProgressAssessmentFromServer(): Promise<LoadedAssessmentSession | null> {
	if (!ASSESSMENT_API_BASE_URL) {
		return null;
	}
	const { getQuestions, listAssessments } = useAssessmentStore.getState();
	const questionsRes = await getQuestions({
		limit: 100,
		is_active: true,
	});
	if (isApiError(questionsRes)) {
		return null;
	}
	const listInProgress = await listAssessments({
		status: "in_progress",
		limit: 1,
	});
	if (isApiError(listInProgress) || !listInProgress.data[0]) {
		return null;
	}
	return fetchLocalSessionForExistingAssessment(
		questionsRes.data,
		listInProgress.data[0]!.id,
	);
}

export function AssessmentPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { getQuestions, getAssessment, listAssessments, createAssessment } =
		useAssessmentStore();
	const locationState = location.state as
		| AssessmentPageLocationState
		| undefined;
	const reviewAssessmentId = locationState?.reviewAssessmentId;
	const editAnswers = locationState?.editAnswers === true;
	const openCompleteFor = locationState?.openCompleteFor?.trim();
	const skipNextInProgressBootstrapRef = useRef(false);
	const reviewRunGen = useRef(0);
	const [step, setStep] = useState<AssessmentPageStep>("intro");
	const [localSession, setLocalSession] =
		useState<AssessmentPageLocalSession | null>(null);
	const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
		"idle",
	);
	const [serverInProgressExists, setServerInProgressExists] = useState(false);
	const [completedAssessmentId, setCompletedAssessmentId] = useState<
		string | null
	>(null);
	const [skipInitialInProgressResume] = useState(
		() =>
			new URLSearchParams(
				typeof window !== "undefined" ? window.location.search : "",
			).get("intro") === "1",
	);
	const [isInitialRouteResolving, setIsInitialRouteResolving] = useState(
		() => !skipInitialInProgressResume && !reviewAssessmentId,
	);
	const [isReviewRouteResolving, setIsReviewRouteResolving] = useState(() =>
		Boolean(reviewAssessmentId),
	);

	useLayoutEffect(() => {
		if (!skipInitialInProgressResume) {
			return;
		}
		navigate(ROUTES.assessment.root, { replace: true });
	}, [navigate, skipInitialInProgressResume]);

	useLayoutEffect(() => {
		if (!openCompleteFor) {
			return;
		}
		skipNextInProgressBootstrapRef.current = true;
		setCompletedAssessmentId(openCompleteFor);
		setStep("complete");
		navigate(ROUTES.assessment.root, { replace: true, state: {} });
	}, [openCompleteFor, navigate]);

	useEffect(() => {
		if (skipNextInProgressBootstrapRef.current) {
			skipNextInProgressBootstrapRef.current = false;
			return;
		}
		if (skipInitialInProgressResume || reviewAssessmentId || openCompleteFor) {
			return;
		}
		let cancel = false;
		void (async () => {
			try {
				const loaded = await tryLoadInProgressAssessmentFromServer();
				if (cancel) {
					return;
				}
				if (loaded) {
					if (loaded.allQuestionsAnswered) {
						setCompletedAssessmentId(loaded.assessmentId);
						setStep("complete");
						return;
					}
					captureAssessmentStarted({
						assessment_id: loaded.assessmentId,
						is_resume: true,
					});
					setLocalSession(loaded);
					setStep("active");
					return;
				}
				if (!ASSESSMENT_API_BASE_URL) {
					return;
				}
				const listCompleted = await listAssessments({
					status: "completed",
					limit: 1,
				});
				if (cancel || isApiError(listCompleted) || !listCompleted.data[0]) {
					return;
				}
				setCompletedAssessmentId(listCompleted.data[0]!.id);
				setStep("complete");
			} finally {
				if (!cancel) {
					setIsInitialRouteResolving(false);
				}
			}
		})();
		return () => {
			cancel = true;
		};
	}, [
		skipInitialInProgressResume,
		reviewAssessmentId,
		openCompleteFor,
		listAssessments,
	]);

	useEffect(() => {
		if (!reviewAssessmentId) {
			setIsReviewRouteResolving(false);
			return;
		}
		const runId = ++reviewRunGen.current;
		setIsReviewRouteResolving(true);
		setLoadState("loading");
		let cancel = false;
		void (async () => {
			if (!ASSESSMENT_API_BASE_URL) {
				if (runId === reviewRunGen.current && !cancel) {
					toast.error(ASSESSMENT_SESSION.errorNoBaseUrl);
					setLoadState("idle");
					setStep("intro");
					navigate(ROUTES.assessment.root, { replace: true, state: {} });
				}
				return;
			}
			const assessmentRes = await getAssessment(reviewAssessmentId);
			if (cancel || runId !== reviewRunGen.current) {
				return;
			}
			if (isApiError(assessmentRes)) {
				toast.error(assessmentRes.message || ASSESSMENT_SESSION.errorLoad);
				setLoadState("idle");
				setStep("intro");
				navigate(ROUTES.assessment.root, { replace: true, state: {} });
				return;
			}
			const {
				status,
				report_key: reportKey,
				completed_at: completedAt,
			} = assessmentRes.data;
			if (status === ASSESSMENT_STATUS.REPORT_GENERATED && reportKey?.trim()) {
				navigate(
					ROUTES.assessment.reportResultsWithIdPath(reviewAssessmentId),
					{
						replace: true,
						state: {
							prefetchedReportResults: {
								reportKey: reportKey.trim(),
								completedAt: completedAt ?? null,
							},
						},
					},
				);
				return;
			}
			if (
				status === ASSESSMENT_STATUS.COMPLETED ||
				status === ASSESSMENT_STATUS.SCORED
			) {
				skipNextInProgressBootstrapRef.current = true;
				setCompletedAssessmentId(reviewAssessmentId);
				setStep("complete");
				setLoadState("idle");
				navigate(ROUTES.assessment.root, { replace: true, state: {} });
				return;
			}
			if (status !== ASSESSMENT_STATUS.IN_PROGRESS) {
				toast.error(ASSESSMENT_SESSION.errorLoad);
				setLoadState("idle");
				setStep("intro");
				navigate(ROUTES.assessment.root, { replace: true, state: {} });
				return;
			}
			const questionsRes = await getQuestions({
				limit: 100,
				is_active: true,
			});
			if (isApiError(questionsRes)) {
				if (runId === reviewRunGen.current && !cancel) {
					toast.error(questionsRes.message || ASSESSMENT_SESSION.errorLoad);
					setLoadState("idle");
					setStep("intro");
					navigate(ROUTES.assessment.root, { replace: true, state: {} });
				}
				return;
			}
			const loaded = await fetchLocalSessionForExistingAssessment(
				questionsRes.data,
				reviewAssessmentId,
			);
			if (cancel || runId !== reviewRunGen.current) {
				return;
			}
			if (!loaded) {
				toast.error(ASSESSMENT_SESSION.errorLoad);
				setLoadState("idle");
				setStep("intro");
				navigate(ROUTES.assessment.root, { replace: true, state: {} });
				return;
			}
			if (loaded.allQuestionsAnswered && !editAnswers) {
				skipNextInProgressBootstrapRef.current = true;
				setCompletedAssessmentId(reviewAssessmentId);
				setStep("complete");
				setLoadState("idle");
				navigate(ROUTES.assessment.root, { replace: true, state: {} });
				return;
			}
			captureAssessmentStarted({
				assessment_id: reviewAssessmentId,
				is_resume: true,
			});
			setCompletedAssessmentId(null);
			setStep("active");
			setLocalSession(loaded);
			setLoadState("idle");
			skipNextInProgressBootstrapRef.current = true;
			navigate(ROUTES.assessment.root, { replace: true, state: {} });
			return;
		})().finally(() => {
			if (!cancel && runId === reviewRunGen.current) {
				setIsReviewRouteResolving(false);
			}
		});
		return () => {
			cancel = true;
		};
	}, [editAnswers, getAssessment, getQuestions, navigate, reviewAssessmentId]);

	useEffect(() => {
		if (step !== "instructions") {
			return;
		}
		let cancelled = false;
		void (async () => {
			if (!ASSESSMENT_API_BASE_URL) {
				if (!cancelled) setServerInProgressExists(false);
				return;
			}
			const listRes = await listAssessments({
				status: "in_progress",
				limit: 1,
			});
			if (cancelled) return;
			if (isApiError(listRes)) {
				setServerInProgressExists(false);
				return;
			}
			setServerInProgressExists(Boolean(listRes.data[0]));
		})();
		return () => {
			cancelled = true;
		};
	}, [listAssessments, step]);

	const beginOrResumeAssessment = useCallback(
		async (returnOnError: "intro" | "instructions") => {
			if (localSession) {
				setStep("active");
				return;
			}
			if (!ASSESSMENT_API_BASE_URL) {
				toast.error(ASSESSMENT_SESSION.errorNoBaseUrl);
				return;
			}
			setStep("active");
			setLoadState("loading");
			const questionsRes = await getQuestions({
				limit: 100,
				is_active: true,
			});
			if (isApiError(questionsRes)) {
				setStep(returnOnError);
				setLoadState("idle");
				toast.error(questionsRes.message || ASSESSMENT_SESSION.errorLoad);
				return;
			}

			const listInProgress = await listAssessments({
				status: "in_progress",
				limit: 1,
			});
			if (isApiError(listInProgress)) {
				setStep(returnOnError);
				setLoadState("idle");
				toast.error(listInProgress.message || ASSESSMENT_SESSION.errorLoad);
				return;
			}

			const existing = listInProgress.data[0];

			if (existing) {
				const res = await fetchLocalSessionForExistingAssessment(
					questionsRes.data,
					existing.id,
				);
				if (!res) {
					setStep(returnOnError);
					setLoadState("idle");
					toast.error(ASSESSMENT_SESSION.errorLoad);
					return;
				}
				if (res.allQuestionsAnswered) {
					setCompletedAssessmentId(existing.id);
					setStep("complete");
					setLoadState("idle");
					return;
				}
				captureAssessmentStarted({
					assessment_id: existing.id,
					is_resume: true,
				});
				setLocalSession(res);
				setLoadState("idle");
				return;
			}
			const createRes = await createAssessment();
			if (isApiError(createRes)) {
				if (createRes.status === 409) {
					const listAgain = await listAssessments({
						status: "in_progress",
						limit: 1,
					});
					if (isApiError(listAgain) || !listAgain.data[0]) {
						setStep(returnOnError);
						setLoadState("idle");
						toast.error(createRes.message || ASSESSMENT_SESSION.errorLoad);
						return;
					}
					const res = await fetchLocalSessionForExistingAssessment(
						questionsRes.data,
						listAgain.data[0]!.id,
					);
					if (!res) {
						setStep(returnOnError);
						setLoadState("idle");
						toast.error(createRes.message || ASSESSMENT_SESSION.errorLoad);
						return;
					}
					if (res.allQuestionsAnswered) {
						setCompletedAssessmentId(listAgain.data[0]!.id);
						setStep("complete");
						setLoadState("idle");
						return;
					}
					captureAssessmentStarted({
						assessment_id: listAgain.data[0]!.id,
						is_resume: true,
					});
					setLocalSession(res);
					setLoadState("idle");
					return;
				}
				setStep(returnOnError);
				setLoadState("idle");
				toast.error(createRes.message || ASSESSMENT_SESSION.errorLoad);
				return;
			}
			const assessmentId = createRes.data.id;
			captureAssessmentStarted({
				assessment_id: assessmentId,
				is_resume: false,
			});
			setLocalSession({
				assessmentId,
				questions: questionsRes.data,
				sessionInitial: null,
				persistedOptionIds: [],
				allQuestionsAnswered: false,
			});
			setLoadState("idle");
		},
		[localSession, getQuestions, listAssessments, createAssessment],
	);

	const handleExit = useCallback(() => {
		navigate(ROUTES.dashboard.root);
	}, [navigate]);

	const handleContinueToInstructions = useCallback(() => {
		setStep("instructions");
	}, []);

	const handleBackToIntro = useCallback(() => {
		setStep("intro");
	}, []);

	const handleStartAssessment = useCallback(() => {
		beginOrResumeAssessment("instructions");
	}, [beginOrResumeAssessment]);

	const handleBackToInstructions = useCallback(() => {
		setStep("instructions");
	}, []);

	const handleAssessmentComplete = useCallback((assessmentId: string) => {
		setCompletedAssessmentId(assessmentId);
		setStep("complete");
	}, []);

	const assessmentLoader = <AppLoader className="min-h-48 py-8" />;

	return (
		<AssessmentLayout>
			{isInitialRouteResolving || isReviewRouteResolving ? (
				assessmentLoader
			) : step === "intro" ? (
				<AssessmentIntroContent
					onExit={handleExit}
					onContinueToInstructions={handleContinueToInstructions}
				/>
			) : step === "instructions" ? (
				<AssessmentInstructionsContent
					hasInProgressSession={Boolean(localSession) || serverInProgressExists}
					onExit={handleExit}
					onBackToIntro={handleBackToIntro}
					onStartAssessment={handleStartAssessment}
				/>
			) : step === "complete" && completedAssessmentId ? (
				<AssessmentCompleteContent assessmentId={completedAssessmentId} />
			) : localSession && loadState !== "loading" ? (
				<AssessmentSessionContent
					assessmentId={localSession.assessmentId}
					persistenceEnabled={!SKIP_ASSESSMENT_PERSISTENCE_APIS}
					questions={localSession.questions}
					onBackToInstructions={handleBackToInstructions}
					onAssessmentComplete={handleAssessmentComplete}
					sessionInitial={localSession.sessionInitial}
					initialPersistedOptionIds={localSession.persistedOptionIds}
				/>
			) : (
				assessmentLoader
			)}
		</AssessmentLayout>
	);
}
