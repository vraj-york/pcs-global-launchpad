import { assessmentCraChartGrid } from "@/assets/assessment";
import { AssessmentReportPanel } from "@/components";
import {
	ASSESSMENT_REPORT_CRA_CHART_GEOMETRY,
	ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED,
} from "@/const";
import { cn } from "@/lib";
import type { AssessmentReportCraChartProps } from "@/types";

const copy = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED;
const {
	viewWidth: VIEW_W,
	viewHeight: VIEW_H,
	hub: HUB,
	controlVertex: CONTROL_VERTEX,
	affiliateVertex: AFFILIATE_VERTEX,
	retreatVertex: RETREAT_VERTEX,
} = ASSESSMENT_REPORT_CRA_CHART_GEOMETRY;
const MAX_SCORE = copy.craChartMaxScore;

function clampScore(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.min(MAX_SCORE, value));
}

function scoreRatio(score: number): number {
	return clampScore(score) / MAX_SCORE;
}

function lerpPoint(
	from: { x: number; y: number },
	to: { x: number; y: number },
	t: number,
): { x: number; y: number } {
	return {
		x: from.x + (to.x - from.x) * t,
		y: from.y + (to.y - from.y) * t,
	};
}

function scorePoint(
	vertex: { x: number; y: number },
	score: number,
): { x: number; y: number } {
	return lerpPoint(HUB, vertex, scoreRatio(score));
}

export function CraChart({
	red,
	green,
	grey,
	className,
	variant = "default",
}: AssessmentReportCraChartProps) {
	const isPrint = variant === "print";
	const control = scorePoint(CONTROL_VERTEX, red);
	const affiliate = scorePoint(AFFILIATE_VERTEX, green);
	const retreat = scorePoint(RETREAT_VERTEX, grey);
	const dataPath = `${control.x},${control.y} ${affiliate.x},${affiliate.y} ${retreat.x},${retreat.y}`;

	const controlLabel = `${copy.craControlLabel} (${Math.round(red)})`;
	const affiliateLabel = `${copy.craAffiliateLabel} (${Math.round(green)})`;
	const retreatLabel = `${copy.craRetreatLabel} (${Math.round(grey)})`;

	return (
		<AssessmentReportPanel
			as="article"
			padding={isPrint ? "sm" : "lg"}
			className={cn(
				isPrint
					? "flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-visible"
					: "flex min-h-0 w-full min-w-0 flex-1 flex-col",
				className,
			)}
			aria-label={copy.craChartAriaLabel}
		>
			<p className="shrink-0 text-center text-small font-semibold leading-small text-brand-red">
				{controlLabel}
			</p>

			<div
				className={cn(
					isPrint
						? "flex min-h-0 flex-1 items-center justify-center overflow-visible"
						: "relative mx-auto my-3 w-full min-h-52 max-w-xs flex-1",
				)}
			>
				<div
					className={cn(
						isPrint
							? "relative aspect-260/225 h-full max-h-full w-auto max-w-full overflow-visible"
							: "relative size-full",
					)}
				>
					<img
						src={assessmentCraChartGrid}
						alt=""
						className="pointer-events-none absolute inset-0 size-full object-contain"
						aria-hidden
					/>
					<svg
						viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
						className="absolute inset-0 size-full"
						preserveAspectRatio="xMidYMid meet"
						aria-hidden
					>
						<title>{copy.craChartAriaLabel}</title>
						<polygon
							points={dataPath}
							fill="var(--brand-primary)"
							fillOpacity="0.2"
						/>
						<polygon
							points={dataPath}
							fill="none"
							stroke="var(--brand-primary)"
							strokeWidth="1"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray="3 5"
						/>
						<line
							x1={HUB.x}
							y1={HUB.y}
							x2={control.x}
							y2={control.y}
							stroke="var(--brand-red)"
							strokeWidth="2.185"
							strokeOpacity="0.7"
						/>
						<line
							x1={HUB.x}
							y1={HUB.y}
							x2={affiliate.x}
							y2={affiliate.y}
							stroke="var(--brand-green)"
							strokeWidth="2.185"
							strokeOpacity="0.7"
						/>
						<line
							x1={HUB.x}
							y1={HUB.y}
							x2={retreat.x}
							y2={retreat.y}
							stroke="var(--icon-primary)"
							strokeWidth="2.185"
							strokeOpacity="0.7"
						/>
						<circle
							cx={control.x}
							cy={control.y}
							r="9.3"
							fill="var(--brand-red)"
							stroke="var(--background)"
							strokeWidth="1.311"
						/>
						<circle
							cx={affiliate.x}
							cy={affiliate.y}
							r="9.3"
							fill="var(--brand-green)"
							stroke="var(--background)"
							strokeWidth="1.311"
						/>
						<circle
							cx={retreat.x}
							cy={retreat.y}
							r="9.3"
							fill="var(--icon-primary)"
							stroke="var(--background)"
							strokeWidth="1.311"
						/>
					</svg>
				</div>
			</div>

			<div className="flex shrink-0 justify-between gap-4 px-1 pb-0.5">
				<p className="text-small font-semibold leading-small text-icon-primary">
					{retreatLabel}
				</p>
				<p className="text-right text-small font-semibold leading-small text-brand-green">
					{affiliateLabel}
				</p>
			</div>
		</AssessmentReportPanel>
	);
}
