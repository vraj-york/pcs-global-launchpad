import {
	Check,
	CircleCheckBig,
	ClockFading,
	OctagonAlert,
	RotateCcw,
} from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENT_REPORT_GENERATION,
	ASSESSMENT_REPORT_GENERATION_STEPS,
	ASSESSMENT_REPORT_LOADER_HERO_ICONS,
	ASSESSMENT_REPORT_LOADER_ROW_ICONS,
	ASSESSMENT_REPORT_RING_CENTER,
	ASSESSMENT_REPORT_RING_CIRCUMFERENCE,
	ASSESSMENT_REPORT_RING_RADIUS,
	ASSESSMENT_REPORT_RING_VIEWBOX_SIZE,
} from "@/const";
import { cn } from "@/lib/utils";
import type {
	AssessmentReportLoaderPillState,
	AssessmentReportProgressRingProps,
	AssessmentReportStatusFlowProps,
	AssessmentReportStepPillProps,
} from "@/types";

function reportLoaderRowPillState(
	pillIndex: number,
	stepIndex: number,
): AssessmentReportLoaderPillState {
	if (stepIndex >= 3) {
		if (pillIndex < 3) return "complete";
		if (pillIndex === 3) return "current";
		return "pending";
	}
	if (pillIndex < stepIndex) return "complete";
	if (pillIndex === stepIndex) return "current";
	return "pending";
}

function ReportProgressRing({
	progress,
	className,
}: AssessmentReportProgressRingProps) {
	const uid = useId().replace(/:/g, "");
	const gradId = `report-ring-grad-${uid}`;
	const p = Math.min(1, Math.max(0, progress));
	const dash = ASSESSMENT_REPORT_RING_CIRCUMFERENCE * p;

	return (
		<svg
			className={cn("pointer-events-none absolute inset-0 size-28", className)}
			viewBox={`0 0 ${ASSESSMENT_REPORT_RING_VIEWBOX_SIZE} ${ASSESSMENT_REPORT_RING_VIEWBOX_SIZE}`}
			role="presentation"
		>
			<title>Report generation progress</title>
			<defs>
				<linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="var(--interactive-success)" />
					<stop offset="100%" stopColor="var(--interactive-info)" />
				</linearGradient>
			</defs>
			<circle
				cx={ASSESSMENT_REPORT_RING_CENTER}
				cy={ASSESSMENT_REPORT_RING_CENTER}
				r={ASSESSMENT_REPORT_RING_RADIUS}
				fill="none"
				className="stroke-border"
				strokeWidth="6"
			/>
			<g
				className={cn(
					"origin-center transform-fill motion-reduce:animate-none",
					"animate-spin duration-2250",
				)}
			>
				<circle
					cx={ASSESSMENT_REPORT_RING_CENTER}
					cy={ASSESSMENT_REPORT_RING_CENTER}
					r={ASSESSMENT_REPORT_RING_RADIUS}
					fill="none"
					stroke={`url(#${gradId})`}
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={`${dash} ${ASSESSMENT_REPORT_RING_CIRCUMFERENCE}`}
					transform={`rotate(-90 ${ASSESSMENT_REPORT_RING_CENTER} ${ASSESSMENT_REPORT_RING_CENTER})`}
				/>
			</g>
		</svg>
	);
}

function StepPill({ state, Icon }: AssessmentReportStepPillProps) {
	return (
		<div
			className={cn(
				"flex size-8 shrink-0 items-center justify-center rounded-full",
				state === "complete" && "bg-interactive-success text-light-same",
				state === "current" && "bg-info text-light-same",
				state === "pending" && "bg-border text-muted-foreground",
			)}
		>
			{state === "complete" ? (
				<Check
					className="size-3.5 shrink-0 text-light-same"
					strokeWidth={2}
					aria-hidden
				/>
			) : (
				<Icon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
			)}
		</div>
	);
}

export function AssessmentReportStatusFlow({
	phase,
	rotatingStepIndex,
	onRetry,
	onReturnToDashboard,
	returnCtaLabel,
}: AssessmentReportStatusFlowProps) {
	const lastStepIndex = ASSESSMENT_REPORT_GENERATION_STEPS.length - 1;
	const stepIndex = Math.min(rotatingStepIndex, lastStepIndex);
	const step = ASSESSMENT_REPORT_GENERATION_STEPS[stepIndex]!;

	if (phase === "error") {
		return (
			<div
				className="flex w-full max-w-lg flex-col items-center gap-8 text-center"
				role="alert"
				aria-live="assertive"
			>
				<div className="relative flex size-28 shrink-0 items-center justify-center">
					<div
						className="flex size-28 items-center justify-center rounded-full bg-interactive-error"
						aria-hidden
					>
						<OctagonAlert
							className="size-12 text-light-same"
							strokeWidth={1.5}
							aria-hidden
						/>
					</div>
				</div>
				<div className="flex w-full flex-col gap-4">
					<h2 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{ASSESSMENT_REPORT_GENERATION.errorTitle}
					</h2>
					<p className="text-balance text-regular font-normal leading-regular text-text-secondary">
						{ASSESSMENT_REPORT_GENERATION.errorSubtitleLead}
						<span className="font-semibold text-text-foreground">
							{ASSESSMENT_REPORT_GENERATION.errorSubtitleEmphasis}
						</span>
						{ASSESSMENT_REPORT_GENERATION.errorSubtitleTrail}
					</p>
				</div>
				<div className="flex w-full flex-col gap-3">
					<Button
						type="button"
						size="lg"
						className="h-11 min-h-11 w-full rounded-xl"
						onClick={onRetry}
						aria-label={ASSESSMENT_REPORT_GENERATION.retryCta}
					>
						<RotateCcw className="me-2 size-3.5 shrink-0" aria-hidden />
						{ASSESSMENT_REPORT_GENERATION.retryCta}
					</Button>
					<Button
						type="button"
						variant="ghost"
						className="w-full"
						onClick={onReturnToDashboard}
					>
						{returnCtaLabel}
					</Button>
				</div>
			</div>
		);
	}

	if (step.layout === "interstitial") {
		return (
			<div
				className="flex w-full max-w-lg flex-col items-center gap-8 text-center"
				role="status"
				aria-live="polite"
				aria-busy
			>
				<div className="relative flex size-28 items-center justify-center">
					<div
						className="flex size-28 items-center justify-center rounded-full bg-interactive-success"
						aria-hidden
					>
						<CircleCheckBig
							className="size-12 text-light-same"
							strokeWidth={1.5}
							aria-hidden
						/>
					</div>
				</div>
				<div className="flex flex-col gap-4">
					<h2 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{step.title}
					</h2>
					<p className="text-balance text-regular font-normal leading-regular text-text-secondary">
						{step.subtitle}
					</p>
				</div>
			</div>
		);
	}

	const HeroIcon = ASSESSMENT_REPORT_LOADER_HERO_ICONS[stepIndex]!;

	return (
		<div
			className="flex w-full max-w-lg flex-col items-center gap-8 text-center"
			role="status"
			aria-live="polite"
			aria-busy
		>
			<div className="flex w-full flex-col items-center gap-5">
				<div className="relative flex size-28 items-center justify-center">
					<ReportProgressRing progress={step.ringProgress} />
					<HeroIcon
						className="relative z-10 size-12 shrink-0 text-info"
						strokeWidth={1.5}
						aria-hidden
					/>
				</div>
				<div className="flex w-full flex-col gap-2">
					<h2 className="text-balance text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{step.title}
					</h2>
					<p className="text-balance text-regular font-normal leading-regular text-muted-foreground">
						{step.subtitle}
					</p>
				</div>
			</div>

			<div className="flex w-full flex-col gap-8">
				<div className="flex w-full flex-col gap-3">
					<div className="flex w-full items-center justify-between text-small font-semibold leading-small tracking-normal text-muted-foreground">
						<span>{ASSESSMENT_REPORT_GENERATION.processingLabel}</span>
						<span className={cn(step.emphasizePercent && "text-info")}>
							{step.percentLabel}
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-border">
						<div
							className="h-full max-w-full rounded-full bg-linear-to-r from-icon-success to-info transition-all duration-700 ease-out motion-reduce:transition-none"
							style={{ width: `${step.barFillPercent}%` }}
						/>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center justify-center gap-8">
					{ASSESSMENT_REPORT_LOADER_ROW_ICONS.map((Icon, i) => {
						const state = reportLoaderRowPillState(i, stepIndex);
						return (
							<StepPill
								key={`report-step-pill-${i}`}
								state={state}
								Icon={Icon}
							/>
						);
					})}
				</div>
			</div>

			<div className="flex items-center justify-center gap-1.5 rounded-3xl border border-transparent bg-background px-4 py-0.5 text-mini font-semibold leading-mini tracking-wide text-info shadow-xs">
				<ClockFading
					className="size-3.5 shrink-0 text-info"
					strokeWidth={2}
					aria-hidden
				/>
				<span>{ASSESSMENT_REPORT_GENERATION.timeEstimatePill}</span>
			</div>
		</div>
	);
}
