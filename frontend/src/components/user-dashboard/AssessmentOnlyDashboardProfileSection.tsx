import { useCallback, useEffect, useState } from "react";
import {
	BehavioralProfileGraphCard,
	OverallBehavioralProfileGraphCardContent,
	OverallBehavioralProfileGraphCardLoadingState,
	UserAssessmentStylesProvider,
} from "@/components";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ASSESSMENT_ONLY_DASHBOARD,
	BEHAVIORAL_PROFILE_GRAPH_CARD,
} from "@/const";
import type { BehavioralProfileGraphCardPhase } from "@/types";
import { resolveLatestScoredAssessment } from "@/utils";

function AssessmentOnlyDashboardEmptyState() {
	return (
		<Card className="border-0 bg-background py-0 rounded-2xl">
			<CardContent className="flex min-h-80 flex-col items-center justify-center gap-2 p-6 text-center">
				<p className="text-regular font-semibold text-text-foreground">
					{BEHAVIORAL_PROFILE_GRAPH_CARD.noAssessmentTitle}
				</p>
				<p className="max-w-md text-small text-text-secondary">
					{BEHAVIORAL_PROFILE_GRAPH_CARD.noAssessmentBody}
				</p>
			</CardContent>
		</Card>
	);
}

function AssessmentOnlyDashboardLoadingState() {
	return (
		<div className="flex flex-col gap-4">
			<OverallBehavioralProfileGraphCardLoadingState />
			<Card className="border-0 bg-background py-0 rounded-2xl">
				<CardContent className="flex flex-col gap-6 p-6">
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-6 w-80 max-w-full" />
						<Skeleton className="h-5 w-full max-w-lg" />
					</div>
					<Skeleton className="h-9 w-full rounded-xl" />
					<Skeleton className="min-h-96 rounded-2xl" />
				</CardContent>
			</Card>
		</div>
	);
}

export function AssessmentOnlyDashboardProfileSection() {
	const [phase, setPhase] =
		useState<BehavioralProfileGraphCardPhase>("loading");
	const [assessmentId, setAssessmentId] = useState<string | null>(null);

	const loadAssessment = useCallback(async () => {
		setPhase("loading");
		const latest = await resolveLatestScoredAssessment();
		if (!latest?.id) {
			setAssessmentId(null);
			setPhase("no-assessment");
			return;
		}
		setAssessmentId(latest.id);
		setPhase("ready");
	}, []);

	useEffect(() => {
		void loadAssessment();
	}, [loadAssessment]);

	if (phase === "loading") {
		return <AssessmentOnlyDashboardLoadingState />;
	}

	if (phase === "no-assessment") {
		return <AssessmentOnlyDashboardEmptyState />;
	}

	if (!assessmentId) {
		return null;
	}

	const quadrantsCard = ASSESSMENT_ONLY_DASHBOARD.quadrantsCard;

	return (
		<UserAssessmentStylesProvider assessmentId={assessmentId}>
			<div className="flex flex-col gap-4">
				<OverallBehavioralProfileGraphCardContent />
				<BehavioralProfileGraphCard
					assessmentId={assessmentId}
					skipStylesProvider
					showExtendedStyleDetails
					title={quadrantsCard.title}
					subtitle={quadrantsCard.subtitle}
					ariaLabel={quadrantsCard.ariaLabel}
				/>
			</div>
		</UserAssessmentStylesProvider>
	);
}
