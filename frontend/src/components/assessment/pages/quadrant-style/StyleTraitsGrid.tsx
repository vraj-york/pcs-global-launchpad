import {
	Brain,
	Building2,
	Globe,
	Star,
	ThumbsDown,
	ThumbsUp,
	TriangleAlert,
} from "lucide-react";
import { AssessmentReportPanel } from "@/components";
import { ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED } from "@/const";
import { cn } from "@/lib";
import type {
	AssessmentReportStyleTraitCardProps,
	AssessmentReportStyleTraitsGridProps,
} from "@/types";

const copy = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED;

const TRAIT_ICONS = {
	globe: Globe,
	star: Star,
	thumbsUp: ThumbsUp,
	thumbsDown: ThumbsDown,
	brain: Brain,
	building: Building2,
} as const;

function TraitCard({
	title,
	body,
	icon,
	compact,
	ftue,
}: AssessmentReportStyleTraitCardProps) {
	const Icon = TRAIT_ICONS[icon];

	if (ftue) {
		return (
			<AssessmentReportPanel
				as="article"
				padding="sm"
				className="flex h-full min-h-0 flex-col gap-1.5"
			>
				<Icon
					className="size-5 shrink-0 text-icon-info"
					strokeWidth={2}
					aria-hidden
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h4 className="text-small font-semibold leading-small text-foreground">
						{title}
					</h4>
					<p className="text-mini font-normal leading-mini text-text-secondary">
						{body}
					</p>
				</div>
			</AssessmentReportPanel>
		);
	}

	return (
		<AssessmentReportPanel
			as="article"
			padding="sm"
			className={cn(
				"flex min-w-0 gap-2",
				compact ? "min-h-0 py-2" : "min-h-20",
			)}
		>
			<div className="flex shrink-0 pt-0.5">
				<Icon className="size-4 text-icon-info" strokeWidth={2} aria-hidden />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h4 className="text-small font-semibold leading-small text-foreground">
					{title}
				</h4>
				<p className="text-mini font-normal leading-mini text-text-secondary">
					{body}
				</p>
			</div>
		</AssessmentReportPanel>
	);
}

export function StyleTraitsGrid({
	traits,
	warningSigns,
	variant = "default",
}: AssessmentReportStyleTraitsGridProps) {
	const isPrint = variant === "print";
	const isFtue = variant === "ftue";

	return (
		<div
			className={cn(
				"flex w-full min-w-0",
				isPrint
					? "min-h-0 flex-1 flex-row gap-2"
					: isFtue
						? "min-h-0 flex-col gap-4"
						: "flex-col gap-2.5 lg:flex-row",
			)}
		>
			<div
				className={cn(
					"grid min-w-0 flex-1",
					isPrint
						? "grid-cols-2 gap-2"
						: isFtue
							? "grid-cols-1 items-stretch gap-2 sm:grid-cols-2"
							: "grid-cols-1 gap-3 sm:grid-cols-2",
				)}
				role="group"
			>
				{traits.map((trait) => (
					<TraitCard
						key={trait.id}
						{...trait}
						compact={isPrint}
						ftue={isFtue}
					/>
				))}
			</div>

			<AssessmentReportPanel
				as="aside"
				variant="warning"
				padding="sm"
				className={cn(
					"flex min-h-0 min-w-0 shrink-0 flex-col self-stretch",
					isPrint
						? "w-40 shrink-0 gap-2 py-2"
						: isFtue
							? "w-full gap-4"
							: "w-full gap-4 lg:w-64 lg:shrink-0",
				)}
				aria-labelledby="prt-warning-signs-heading"
			>
				<div className="flex items-center gap-2">
					<TriangleAlert
						className="size-4 shrink-0 text-warning"
						strokeWidth={2}
						aria-hidden
					/>
					<h4
						id="prt-warning-signs-heading"
						className="text-mini font-semibold leading-mini text-foreground"
					>
						{copy.warningSignsTitle}
					</h4>
				</div>
				{warningSigns.length > 0 ? (
					<div className={cn("flex flex-wrap", isFtue ? "gap-2" : "gap-1.5")}>
						{warningSigns.map((sign) => (
							<span
								key={sign}
								className={cn(
									"rounded-lg bg-warning-bg text-mini font-semibold leading-mini text-warning-text",
									isFtue ? "p-2" : "px-2 py-1",
								)}
							>
								{sign}
							</span>
						))}
					</div>
				) : null}
			</AssessmentReportPanel>
		</div>
	);
}
