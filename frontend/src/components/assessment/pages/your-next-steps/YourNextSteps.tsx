import { AssessmentReportSection } from "@/components";
import { ASSESSMENT_REPORT_NEXT_STEPS } from "@/const";
import type { YourNextStepsProps } from "@/types";
import { NextStepActionCard } from ".";

const sectionCopy = ASSESSMENT_REPORT_NEXT_STEPS;

export function YourNextSteps({
	content,
	onShare,
	variant = "default",
	shareReportHref,
}: YourNextStepsProps) {
	const isPrint = variant === "print";

	return (
		<AssessmentReportSection
			id={sectionCopy.sectionId}
			title={sectionCopy.sectionTitle}
			subtitle={sectionCopy.sectionSubtitle}
		>
			<div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
				<NextStepActionCard
					card={content.left}
					icon={sectionCopy.cards.left.icon}
					ctaLabel={sectionCopy.cards.left.ctaLabel}
					showCta={!isPrint}
				/>
				<NextStepActionCard
					card={content.right}
					icon={sectionCopy.cards.right.icon}
					ctaLabel={sectionCopy.cards.right.ctaLabel}
					usesShareHandler={sectionCopy.cards.right.usesShareHandler}
					shareReportHref={isPrint ? shareReportHref : undefined}
					onShare={onShare}
				/>
			</div>
		</AssessmentReportSection>
	);
}
