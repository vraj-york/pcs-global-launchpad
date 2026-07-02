import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import {
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { shareAssessmentReport } from "@/api";
import {
	AppLoader,
	AssessmentCoachingTrigger,
	AssessmentReportResultsContent,
	AssessmentReportResultsShell,
	AssessmentReportStatusFlow,
	ShareAssessmentReportModal,
	UserAssessmentStylesProvider,
} from "@/components";
import {
	ASSESSMENT_REPORT_GENERATION,
	ASSESSMENT_REPORT_MAX_WAIT_MS,
	ASSESSMENT_REPORT_POLL_MS,
	ASSESSMENT_REPORT_RESULTS_PAGE,
	ASSESSMENT_REPORT_SHARE,
	ASSESSMENT_REPORT_STEP_ROTATE_MS,
	ASSESSMENT_REPORT_VIEW,
	ASSESSMENT_REPORTS_BASE_URL,
	ROUTES,
	SKIP_ASSESSMENT_PERSISTENCE_APIS,
} from "@/const";
import { AssessmentLayout } from "@/layout";
import { isApiError } from "@/lib";
import { useAssessmentStore, useAuthStore, useUsersStore } from "@/store";
import type {
	AssessmentReportResultsLocationState,
	AssessmentReportResultsPhase,
	AssessmentReportResultsRouteParams,
} from "@/types";
import {
	deriveNameFromEmail,
	downloadAssessmentReport,
	formatAssessmentReportCompletedLine,
} from "@/utils";

export function AssessmentReportResultsPage() {
	const { assessmentId } = useParams<AssessmentReportResultsRouteParams>();
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { getAssessment } = useAssessmentStore();
	const locationState =
		location.state as AssessmentReportResultsLocationState | null;

	const returnTo = locationState?.returnTo ?? null;
	const prefetchedKey =
		locationState?.prefetchedReportResults?.reportKey?.trim() ?? "";
	const prefetchedCompletedAt =
		locationState?.prefetchedReportResults?.completedAt ?? null;
	const hasPrefetchedReport = prefetchedKey.length > 0;
	const prefetchedReportResults = useMemo(
		() =>
			hasPrefetchedReport
				? { reportKey: prefetchedKey, completedAt: prefetchedCompletedAt }
				: null,
		[hasPrefetchedReport, prefetchedKey, prefetchedCompletedAt],
	);
	const triggerCoaching = locationState?.triggerCoaching === true;

	const hasDirectoryReturn = Boolean(returnTo?.path);
	const backLabel = hasDirectoryReturn
		? ASSESSMENT_REPORT_RESULTS_PAGE.backLabel
		: ASSESSMENT_REPORT_RESULTS_PAGE.closeLabel;
	const backVariant = hasDirectoryReturn ? "back" : "close";
	const returnCtaLabel = hasDirectoryReturn
		? ASSESSMENT_REPORT_RESULTS_PAGE.backLabel
		: ASSESSMENT_REPORT_GENERATION.returnToDashboardCta;
	const { email, user } = useAuthStore();
	const viewerCognitoSub = user?.userId?.trim() ?? "";
	const { firstName, lastName } = useUsersStore();
	const reportWelcomeDisplayName = useMemo(() => {
		const full = [firstName, lastName].filter(Boolean).join(" ").trim();
		return (
			full ||
			deriveNameFromEmail(email) ||
			ASSESSMENT_REPORT_VIEW.welcomeDisplayNameFallback
		);
	}, [firstName, lastName, email]);

	const [phase, setPhase] = useState<AssessmentReportResultsPhase>(() =>
		prefetchedReportResults ? "ready" : "load",
	);
	const [rotatingStepIndex, setRotatingStepIndex] = useState(0);
	const [reportKey, setReportKey] = useState<string | null>(
		() => prefetchedReportResults?.reportKey ?? null,
	);
	const [pollToken, setPollToken] = useState(0);
	const [completedAt, setCompletedAt] = useState<string | null>(
		() => prefetchedReportResults?.completedAt ?? null,
	);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [isSharing, setIsSharing] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [assessmentOwnerId, setAssessmentOwnerId] = useState<
		string | null | undefined
	>(undefined);

	const safeId = assessmentId?.trim() ?? "";

	const isViewingOwnAssessment =
		assessmentOwnerId !== undefined &&
		assessmentOwnerId !== null &&
		viewerCognitoSub.length > 0 &&
		assessmentOwnerId === viewerCognitoSub;

	useLayoutEffect(() => {
		if (SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			navigate(ROUTES.assessment.root, { replace: true });
		}
	}, [navigate]);

	useEffect(() => {
		if (!safeId || SKIP_ASSESSMENT_PERSISTENCE_APIS) {
			return;
		}
		let cancelled = false;
		setAssessmentOwnerId(undefined);
		void (async () => {
			const res = await getAssessment(safeId);
			if (cancelled) {
				return;
			}
			if (isApiError(res)) {
				setAssessmentOwnerId(null);
				if (!hasPrefetchedReport) {
					toast.error(ASSESSMENT_REPORT_GENERATION.reportResultsLoadError);
					setPhase("error");
				}
				return;
			}
			setAssessmentOwnerId(res.data.user_id?.trim() ?? null);
			if (hasPrefetchedReport) {
				return;
			}
			const { status, report_key: rk, completed_at: doneAt } = res.data;
			setCompletedAt(doneAt ?? null);
			if (status === "report_generated" && rk) {
				setReportKey(rk);
				setPhase("ready");
				return;
			}
			if (status === "completed" || status === "scored") {
				setReportKey(null);
				setPhase("generating");
				return;
			}
			toast.error(ASSESSMENT_REPORT_GENERATION.reportResultsUnavailable);
			navigate(ROUTES.assessment.root, { replace: true });
		})();
		return () => {
			cancelled = true;
		};
	}, [safeId, getAssessment, navigate, hasPrefetchedReport]);

	useEffect(() => {
		if (phase !== "generating") {
			return;
		}
		const id = window.setInterval(() => {
			setRotatingStepIndex((i) => i + 1);
		}, ASSESSMENT_REPORT_STEP_ROTATE_MS);
		return () => window.clearInterval(id);
	}, [phase, pollToken]);

	useEffect(() => {
		if (phase !== "generating") {
			return;
		}
		let cancelled = false;
		const started = Date.now();
		const run = async () => {
			while (
				!cancelled &&
				Date.now() - started < ASSESSMENT_REPORT_MAX_WAIT_MS
			) {
				const res = await getAssessment(safeId);
				if (cancelled) {
					return;
				}
				if (isApiError(res)) {
					setPhase("error");
					return;
				}
				const { status, report_key: rk, completed_at: doneAt } = res.data;
				setCompletedAt(doneAt ?? null);
				if (status === "report_generated" && rk) {
					setReportKey(rk);
					setPhase("ready");
					return;
				}
				await new Promise<void>((r) => {
					window.setTimeout(r, ASSESSMENT_REPORT_POLL_MS);
				});
			}
			if (!cancelled) {
				setPhase("error");
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [phase, pollToken, safeId, getAssessment]);

	useEffect(() => {
		if (
			phase === "ready" &&
			isViewingOwnAssessment &&
			searchParams.get("share") === "1"
		) {
			setShareModalOpen(true);
		}
	}, [phase, searchParams, isViewingOwnAssessment]);

	const handleOpenShareModal = useCallback(() => {
		setShareModalOpen(true);
	}, []);

	const handleShareModalOpenChange = useCallback((open: boolean) => {
		setShareModalOpen(open);
	}, []);

	const handleShareReportConfirm = useCallback(
		async (recipients: string[]) => {
			if (recipients.length === 0) {
				toast.error(ASSESSMENT_REPORT_SHARE.noRecipients);
				return;
			}
			if (!safeId) {
				return;
			}
			setIsSharing(true);
			try {
				const res = await shareAssessmentReport(safeId, recipients);
				if (!res.ok) {
					toast.error(res.message || ASSESSMENT_REPORT_SHARE.shareFailed);
					return;
				}
				toast.success(ASSESSMENT_REPORT_SHARE.success);
				setShareModalOpen(false);
			} catch {
				toast.error(ASSESSMENT_REPORT_SHARE.shareFailed);
			} finally {
				setIsSharing(false);
			}
		},
		[safeId],
	);

	const completedSubtitle = useMemo(
		() =>
			formatAssessmentReportCompletedLine(
				completedAt,
				ASSESSMENT_REPORT_RESULTS_PAGE.completedUnknown,
			),
		[completedAt],
	);

	const downloadDisabled = !reportKey || !ASSESSMENT_REPORTS_BASE_URL;

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
		setPollToken((t) => t + 1);
		setPhase("generating");
	}, []);

	const handleBack = useCallback(() => {
		if (returnTo?.path) {
			navigate(returnTo.path, { state: returnTo.state });
			return;
		}
		navigate(ROUTES.dashboard.root);
	}, [navigate, returnTo]);

	if (!safeId) {
		return null;
	}

	if (phase === "load") {
		return (
			<AssessmentLayout>
				<AppLoader className="min-h-48 flex-1 py-16" />
			</AssessmentLayout>
		);
	}

	if (phase === "ready") {
		return (
			<AssessmentLayout>
				<AssessmentReportResultsShell
					completedSubtitle={completedSubtitle}
					downloadDisabled={downloadDisabled}
					isDownloading={isDownloading}
					backLabel={backLabel}
					backVariant={backVariant}
					showTitleAndSubtitle={isViewingOwnAssessment}
					showShare={isViewingOwnAssessment}
					onBack={handleBack}
					onShare={handleOpenShareModal}
					onDownload={handleDownload}
				>
					<UserAssessmentStylesProvider assessmentId={safeId}>
						<AssessmentCoachingTrigger
							assessmentId={safeId}
							displayName={reportWelcomeDisplayName}
							enabled={triggerCoaching && isViewingOwnAssessment}
						/>
						<div className="flex w-full min-w-0 max-w-none flex-col items-stretch gap-8">
							<AssessmentReportResultsContent
								welcomeDisplayName={reportWelcomeDisplayName}
								onShare={
									isViewingOwnAssessment ? handleOpenShareModal : undefined
								}
							/>
						</div>
					</UserAssessmentStylesProvider>
				</AssessmentReportResultsShell>
				{isViewingOwnAssessment ? (
					<ShareAssessmentReportModal
						open={shareModalOpen}
						onOpenChange={handleShareModalOpenChange}
						onShare={handleShareReportConfirm}
						isSharing={isSharing}
					/>
				) : null}
			</AssessmentLayout>
		);
	}

	return (
		<AssessmentLayout>
			<div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
				<div className="flex w-full flex-col items-stretch">
					<AssessmentReportStatusFlow
						phase={phase === "error" ? "error" : "generating"}
						rotatingStepIndex={rotatingStepIndex}
						onRetry={handleRetry}
						onReturnToDashboard={handleBack}
						returnCtaLabel={returnCtaLabel}
					/>
				</div>
			</div>
		</AssessmentLayout>
	);
}
