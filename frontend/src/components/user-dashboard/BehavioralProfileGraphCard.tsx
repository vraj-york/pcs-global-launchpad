import { useCallback, useEffect, useState } from "react";
import {
	ContextStyleOverview,
	ContextStyleSection,
	UserAssessmentStylesProvider,
	useUserAssessmentStylesContext,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	BEHAVIORAL_PROFILE_GRAPH_CARD,
	BEHAVIORAL_PROFILE_GRAPH_TABS,
} from "@/const";
import { cn } from "@/lib";
import type {
	BehavioralProfileGraphCardBodyProps,
	BehavioralProfileGraphCardPhase,
	BehavioralProfileGraphCardProps,
	BehavioralProfileGraphCardShellProps,
	BehavioralProfileGraphErrorStateProps,
	BehavioralProfileGraphHeaderProps,
	BehavioralProfileGraphTabId,
	BehavioralProfileGraphTabPanelProps,
	BehavioralProfileGraphTabsProps,
} from "@/types";
import { resolveLatestScoredAssessmentId } from "@/utils";

function BehavioralProfileGraphCardShell({
	className,
	children,
	ariaLabel = BEHAVIORAL_PROFILE_GRAPH_CARD.ariaLabel,
}: BehavioralProfileGraphCardShellProps & { ariaLabel?: string }) {
	return (
		<Card
			className={cn("border-0 bg-background py-0 rounded-2xl", className)}
			aria-label={ariaLabel}
		>
			<CardContent className="flex flex-col gap-6 p-6">{children}</CardContent>
		</Card>
	);
}

function BehavioralProfileGraphHeader({
	title = BEHAVIORAL_PROFILE_GRAPH_CARD.title,
	subtitle = BEHAVIORAL_PROFILE_GRAPH_CARD.subtitle,
}: Partial<BehavioralProfileGraphHeaderProps>) {
	return (
		<div className="flex flex-col gap-1.5">
			<h2 className="text-heading-4 font-semibold text-text-foreground">
				{title}
			</h2>
			<p className="text-small text-text-secondary">{subtitle}</p>
		</div>
	);
}

function BehavioralProfileGraphTabs({
	activeTab,
	onTabChange,
}: BehavioralProfileGraphTabsProps) {
	return (
		<div
			className="flex w-full flex-wrap items-center gap-2.5 rounded-xl bg-info-bg p-1"
			role="tablist"
			aria-label={BEHAVIORAL_PROFILE_GRAPH_CARD.tabsAriaLabel}
		>
			{BEHAVIORAL_PROFILE_GRAPH_TABS.map((tab) => (
				<button
					key={tab.id}
					id={`behavioral-profile-tab-${tab.id}`}
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					tabIndex={activeTab === tab.id ? 0 : -1}
					onClick={() => onTabChange(tab.id)}
					className={cn(
						"flex h-9 min-h-8 min-w-8 flex-1 cursor-pointer items-center justify-center rounded-lg px-2.5 py-1.5 text-small font-semibold transition-colors",
						activeTab === tab.id
							? "bg-info text-light-same"
							: "text-text-secondary hover:text-text-foreground",
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}

function BehavioralProfileGraphLoadingState({
	className,
}: BehavioralProfileGraphCardProps) {
	return (
		<BehavioralProfileGraphCardShell className={className}>
			<BehavioralProfileGraphHeader />
			<Skeleton className="h-9 w-full rounded-xl" />
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,32rem)_1fr]">
				<Skeleton className="min-h-96 rounded-2xl" />
				<div className="flex flex-col gap-4">
					<Skeleton className="min-h-52 flex-1 rounded-2xl" />
					<Skeleton className="min-h-36 rounded-2xl" />
				</div>
			</div>
		</BehavioralProfileGraphCardShell>
	);
}

function BehavioralProfileGraphEmptyState({
	className,
}: BehavioralProfileGraphCardProps) {
	return (
		<BehavioralProfileGraphCardShell className={className}>
			<BehavioralProfileGraphHeader />
			<div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background p-6 text-center">
				<p className="text-regular font-semibold text-text-foreground">
					{BEHAVIORAL_PROFILE_GRAPH_CARD.noAssessmentTitle}
				</p>
				<p className="max-w-md text-small text-text-secondary">
					{BEHAVIORAL_PROFILE_GRAPH_CARD.noAssessmentBody}
				</p>
			</div>
		</BehavioralProfileGraphCardShell>
	);
}

function BehavioralProfileGraphErrorState({
	className,
	onRetry,
}: BehavioralProfileGraphErrorStateProps) {
	return (
		<BehavioralProfileGraphCardShell className={className}>
			<BehavioralProfileGraphHeader />
			<div className="flex min-h-80 flex-col items-start justify-center gap-4 rounded-2xl border border-border bg-background p-6">
				<p className="text-regular text-text-secondary">
					{BEHAVIORAL_PROFILE_GRAPH_CARD.loadError}
				</p>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onClick={onRetry}
					aria-label={BEHAVIORAL_PROFILE_GRAPH_CARD.retryButton}
				>
					{BEHAVIORAL_PROFILE_GRAPH_CARD.retryButton}
				</Button>
			</div>
		</BehavioralProfileGraphCardShell>
	);
}

function BehavioralProfileGraphTabPanel({
	activeTab,
	showExtendedStyleDetails = false,
}: BehavioralProfileGraphTabPanelProps) {
	const { loadState, styles } = useUserAssessmentStylesContext();

	if (loadState === "loading" || loadState === "idle" || !styles) {
		return (
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,32rem)_1fr]">
				<Skeleton className="min-h-96 rounded-2xl" />
				<div className="flex flex-col gap-4">
					<Skeleton className="min-h-52 flex-1 rounded-2xl" />
					<Skeleton className="min-h-36 rounded-2xl" />
				</div>
			</div>
		);
	}

	if (loadState === "error") {
		return (
			<p className="text-regular text-text-secondary">
				{BEHAVIORAL_PROFILE_GRAPH_CARD.loadError}
			</p>
		);
	}

	return (
		<div
			role="tabpanel"
			aria-labelledby={`behavioral-profile-tab-${activeTab}`}
		>
			{showExtendedStyleDetails ? (
				<ContextStyleSection contextKey={activeTab} styles={styles} embedded />
			) : (
				<ContextStyleOverview contextKey={activeTab} styles={styles} />
			)}
		</div>
	);
}

function BehavioralProfileGraphCardBody({
	className,
	assessmentId: _assessmentId,
	showExtendedStyleDetails = false,
	title,
	subtitle,
	ariaLabel,
	skipStylesProvider = false,
}: BehavioralProfileGraphCardBodyProps) {
	const [activeTab, setActiveTab] = useState<BehavioralProfileGraphTabId>(
		"professional_typical",
	);

	const body = (
		<BehavioralProfileGraphCardShell
			className={className}
			ariaLabel={ariaLabel}
		>
			<BehavioralProfileGraphHeader title={title} subtitle={subtitle} />
			<BehavioralProfileGraphTabs
				activeTab={activeTab}
				onTabChange={setActiveTab}
			/>
			<BehavioralProfileGraphTabPanel
				activeTab={activeTab}
				showExtendedStyleDetails={showExtendedStyleDetails}
			/>
		</BehavioralProfileGraphCardShell>
	);

	if (skipStylesProvider) {
		return body;
	}

	return (
		<UserAssessmentStylesProvider assessmentId={_assessmentId}>
			{body}
		</UserAssessmentStylesProvider>
	);
}

export function BehavioralProfileGraphCard({
	className,
	assessmentId: assessmentIdProp,
	showExtendedStyleDetails,
	title,
	subtitle,
	ariaLabel,
	skipStylesProvider = false,
}: BehavioralProfileGraphCardProps) {
	const [phase, setPhase] = useState<BehavioralProfileGraphCardPhase>(
		assessmentIdProp ? "ready" : "loading",
	);
	const [assessmentId, setAssessmentId] = useState<string | null>(
		assessmentIdProp ?? null,
	);

	const loadAssessment = useCallback(async () => {
		if (assessmentIdProp) {
			return;
		}
		setPhase("loading");
		const id = await resolveLatestScoredAssessmentId();
		if (!id) {
			setAssessmentId(null);
			setPhase("no-assessment");
			return;
		}
		setAssessmentId(id);
		setPhase("ready");
	}, [assessmentIdProp]);

	useEffect(() => {
		if (assessmentIdProp) {
			setAssessmentId(assessmentIdProp);
			setPhase("ready");
			return;
		}
		void loadAssessment();
	}, [assessmentIdProp, loadAssessment]);

	if (phase === "loading") {
		return <BehavioralProfileGraphLoadingState className={className} />;
	}

	if (phase === "no-assessment") {
		return <BehavioralProfileGraphEmptyState className={className} />;
	}

	if (phase === "error") {
		return (
			<BehavioralProfileGraphErrorState
				className={className}
				onRetry={() => {
					void loadAssessment();
				}}
			/>
		);
	}

	if (!assessmentId) {
		return null;
	}

	return (
		<BehavioralProfileGraphCardBody
			className={className}
			assessmentId={assessmentId}
			showExtendedStyleDetails={showExtendedStyleDetails}
			title={title}
			subtitle={subtitle}
			ariaLabel={ariaLabel}
			skipStylesProvider={skipStylesProvider}
		/>
	);
}
