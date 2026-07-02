import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
	AssessmentReportSection,
	useUserAssessmentStylesContext,
} from "@/components";
import { ASSESSMENT_REPORT_STRESS_MANAGEMENT } from "@/const";
import type {
	DecreaseStressScoreMetrics,
	StressManagementProps,
} from "@/types";
import {
	parseWhenFeelingStressedSteps,
	resolveDecreaseStressContent,
} from "@/utils";
import {
	DecreaseStressPrimaryCard,
	DecreaseStressSecondaryCard,
	DecreaseStressStressedStepsCard,
} from ".";

const sectionCopy = ASSESSMENT_REPORT_STRESS_MANAGEMENT;

export function StressManagement({
	decreaseStressContent,
	variant = "default",
}: StressManagementProps) {
	const isPrint = variant === "print";
	const { loadState, styles } = useUserAssessmentStylesContext();

	useEffect(() => {
		if (loadState === "error") {
			toast.error(sectionCopy.loadErrorBody);
		}
	}, [loadState]);

	const metrics: DecreaseStressScoreMetrics | null =
		styles?.decrease_stress_metrics ?? null;

	const content = useMemo(() => {
		if (!metrics) {
			return null;
		}
		return resolveDecreaseStressContent(decreaseStressContent, metrics);
	}, [decreaseStressContent, metrics]);

	const stressedSteps = useMemo(() => {
		const raw = styles?.overall_style?.style?.when_feeling_stressed ?? "";
		return parseWhenFeelingStressedSteps(raw);
	}, [styles]);

	if (loadState === "loading" || loadState === "idle") {
		return (
			<AssessmentReportSection
				id={sectionCopy.sectionId}
				title={sectionCopy.sectionTitle}
				loadState="loading"
			/>
		);
	}

	if (loadState === "error" || !content || !metrics) {
		return (
			<AssessmentReportSection
				id={sectionCopy.sectionId}
				title={sectionCopy.sectionTitle}
				loadState="error"
				errorBody={sectionCopy.loadErrorBody}
			/>
		);
	}

	return (
		<AssessmentReportSection
			id={sectionCopy.sectionId}
			title={sectionCopy.sectionTitle}
			headerClassName={isPrint ? "shrink-0" : undefined}
		>
			{isPrint ? (
				<div className="flex min-h-0 w-full min-w-0 flex-1 flex-row items-stretch gap-[10px] overflow-visible">
					<div className="flex min-h-0 w-full max-w-sm shrink-0 flex-col self-stretch overflow-visible">
						<DecreaseStressPrimaryCard
							content={content.primary}
							useCompactPadding
							panelClassName="flex h-full w-full min-h-0 flex-1 flex-col gap-4 overflow-visible rounded-2xl bg-info-bg p-5"
							iconWrapperClassName="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary p-1"
							iconClassName="size-7 shrink-0 text-light-same"
							textClassName="flex w-full shrink-0 flex-col gap-3"
							titleClassName="text-heading-3 font-semibold leading-heading-3 tracking-heading-3 text-primary"
							leadClassName="text-regular font-semibold leading-regular text-foreground"
							bodyClassName="text-regular font-normal leading-regular text-foreground"
						/>
					</div>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-[10px] self-stretch overflow-visible">
						<DecreaseStressStressedStepsCard
							items={stressedSteps}
							useCompactPadding
							panelClassName="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden rounded-2xl p-5"
							titleClassName="shrink-0 text-heading-4 font-semibold leading-heading-4 tracking-heading-4 text-foreground"
							innerPanelClassName="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl bg-background p-5"
							listClassName="list-disc space-y-1 ps-4 text-small leading-small text-text-secondary"
						/>
						<DecreaseStressSecondaryCard
							content={content.secondary}
							useCompactPadding
							className="relative flex w-full shrink-0 flex-none flex-col overflow-hidden rounded-2xl border border-border p-4 lg:flex-none"
							targetClassName="pointer-events-none absolute -bottom-8 -end-8 size-28 text-border opacity-40"
							textClassName="relative z-10 text-regular font-normal leading-regular text-foreground"
						/>
					</div>
				</div>
			) : (
				<div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
					<div className="flex w-full min-w-0 flex-col gap-4 self-stretch lg:max-w-sm lg:shrink-0">
						<DecreaseStressPrimaryCard content={content.primary} />
						<DecreaseStressSecondaryCard content={content.secondary} />
					</div>
					<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col self-stretch">
						<DecreaseStressStressedStepsCard items={stressedSteps} />
					</div>
				</div>
			)}
		</AssessmentReportSection>
	);
}
