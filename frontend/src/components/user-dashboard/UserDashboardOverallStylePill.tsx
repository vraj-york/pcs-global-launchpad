import { useCallback, useEffect, useState } from "react";
import {
	UserAssessmentStylesProvider,
	useUserAssessmentStylesContext,
} from "@/components";
import { cn } from "@/lib";
import {
	resolveLatestScoredAssessmentId,
	resolveOverallStyleIndicator,
} from "@/utils";

function UserDashboardOverallStylePillIndicator() {
	const { loadState, styles } = useUserAssessmentStylesContext();

	if (loadState !== "ok" || !styles) {
		return null;
	}

	const indicator = resolveOverallStyleIndicator(styles.overall_style.style);

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full px-4 py-2 sm:px-6 sm:py-3",
				indicator.pillClass,
			)}
			role="group"
			aria-label={indicator.ariaLabel}
		>
			<span
				className={cn(
					"text-center font-semibold text-light-same sm:whitespace-nowrap",
					"text-small leading-small sm:text-heading-4 sm:leading-heading-4",
				)}
			>
				{`${indicator.styleNumber} - ${indicator.title}`}
			</span>
		</div>
	);
}

function UserDashboardOverallStylePillBody({
	assessmentId,
}: {
	assessmentId: string;
}) {
	return (
		<UserAssessmentStylesProvider assessmentId={assessmentId}>
			<UserDashboardOverallStylePillIndicator />
		</UserAssessmentStylesProvider>
	);
}

export function UserDashboardOverallStylePill() {
	const [assessmentId, setAssessmentId] = useState<string | null>(null);

	const loadAssessment = useCallback(async () => {
		const id = await resolveLatestScoredAssessmentId();
		setAssessmentId(id);
	}, []);

	useEffect(() => {
		void loadAssessment();
	}, [loadAssessment]);

	if (!assessmentId) {
		return null;
	}

	return <UserDashboardOverallStylePillBody assessmentId={assessmentId} />;
}
