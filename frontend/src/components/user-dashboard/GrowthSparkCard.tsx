import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyGrowthSpark } from "@/api";
import growthSparkStarSvg from "@/assets/dashboard/growth-spark-star.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GROWTH_SPARK_CARD } from "@/const";
import { cn, isApiError } from "@/lib";
import type {
	GrowthSparkCardPhase,
	GrowthSparkCardProps,
	GrowthSparkCardShellProps,
	GrowthSparkData,
} from "@/types";
import { parseGrowthSparkContent } from "@/utils";

function GrowthSparkCardShell({
	className,
	children,
	ariaLabel = GROWTH_SPARK_CARD.ariaLabel,
}: GrowthSparkCardShellProps) {
	return (
		<Card
			className={cn(
				"relative h-full overflow-hidden border-0 py-0 rounded-2xl",
				"bg-[linear-gradient(98deg,var(--color-interactive-primary)_20.116%,var(--color-interactive-secondary)_100%)]",
				className,
			)}
			aria-label={ariaLabel}
		>
			<div
				className="pointer-events-none absolute left-3/5 top-1/3 flex size-84 items-center justify-center rotate-15 opacity-[0.08]"
				aria-hidden="true"
			>
				<img src={growthSparkStarSvg} alt="" className="size-full" />
			</div>
			<CardContent className="relative z-10 flex h-full flex-col gap-6 p-6">
				{children}
			</CardContent>
		</Card>
	);
}

function GrowthSparkCardHeader() {
	return (
		<div className="flex items-center gap-3">
			<div
				className={cn(
					"flex size-14 shrink-0 items-center justify-center rounded-xl p-1.5",
					"bg-[linear-gradient(147deg,var(--color-interactive-warning)_12.364%,var(--color-interactive-warning-active)_87.636%)]",
				)}
			>
				<img
					src={growthSparkStarSvg}
					alt=""
					className="size-8 shrink-0"
					aria-hidden="true"
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h3 className="text-heading-4 font-semibold text-light-same">
					{GROWTH_SPARK_CARD.title}
				</h3>
				<p className="text-regular text-light-same opacity-70">
					{GROWTH_SPARK_CARD.subtitle}
				</p>
			</div>
		</div>
	);
}

function GrowthSparkLoadingState({ className }: GrowthSparkCardProps) {
	return (
		<GrowthSparkCardShell className={className}>
			<GrowthSparkCardHeader />
			<div className="flex flex-col gap-4">
				<Skeleton className="h-7 w-4/5 bg-light-same/20" />
				<Skeleton className="h-4 w-full bg-light-same/15" />
				<Skeleton className="h-4 w-full bg-light-same/15" />
				<Skeleton className="h-4 w-3/4 bg-light-same/15" />
			</div>
		</GrowthSparkCardShell>
	);
}

function GrowthSparkContent({
	className,
	data,
}: GrowthSparkCardProps & { data: GrowthSparkData }) {
	const { headline, paragraphs } = parseGrowthSparkContent(
		data.title,
		data.body,
	);

	return (
		<GrowthSparkCardShell className={className}>
			<GrowthSparkCardHeader />
			<div className="flex flex-col gap-4 text-light-same">
				{headline ? (
					<p className="text-balance text-heading-3 font-semibold leading-heading-3 tracking-normal">
						{headline}
					</p>
				) : null}
				{paragraphs.length > 0 ? (
					<div className="flex flex-col gap-4 text-regular font-medium opacity-70">
						{paragraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				) : null}
			</div>
		</GrowthSparkCardShell>
	);
}

function GrowthSparkErrorState({
	className,
	onRetry,
}: GrowthSparkCardProps & { onRetry: () => void }) {
	return (
		<GrowthSparkCardShell className={className}>
			<GrowthSparkCardHeader />
			<div className="flex flex-col items-start gap-4">
				<p className="text-regular text-light-same opacity-70">
					{GROWTH_SPARK_CARD.loadErrorToast}
				</p>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onClick={onRetry}
					aria-label={GROWTH_SPARK_CARD.retryButton}
				>
					{GROWTH_SPARK_CARD.retryButton}
				</Button>
			</div>
		</GrowthSparkCardShell>
	);
}

export function GrowthSparkCard({ className }: GrowthSparkCardProps) {
	const [phase, setPhase] = useState<GrowthSparkCardPhase>("loading");
	const [data, setData] = useState<GrowthSparkData | null>(null);

	const loadGrowthSpark = useCallback(async () => {
		setPhase("loading");
		const result = await getMyGrowthSpark();

		if (isApiError(result)) {
			if (result.status === 404) {
				setData(null);
				setPhase("hidden");
				return;
			}
			toast.error(GROWTH_SPARK_CARD.loadErrorToast);
			setPhase("error");
			return;
		}

		setData(result.data);
		setPhase("ready");
	}, []);

	useEffect(() => {
		void loadGrowthSpark();
	}, [loadGrowthSpark]);

	if (phase === "hidden") {
		return null;
	}

	if (phase === "loading") {
		return <GrowthSparkLoadingState className={className} />;
	}

	if (phase === "error") {
		return (
			<GrowthSparkErrorState
				className={className}
				onRetry={() => {
					void loadGrowthSpark();
				}}
			/>
		);
	}

	if (!data) {
		return null;
	}

	return <GrowthSparkContent className={className} data={data} />;
}
