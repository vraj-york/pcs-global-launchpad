import { ChevronLeft, Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssessmentReportResultsHeaderProps } from "@/types";

export function AssessmentReportResultsHeader({
	pageTitle,
	completedSubtitle,
	backLabel,
	backVariant,
	showTitleAndSubtitle,
	showShare,
	shareLabel,
	downloadLabel,
	downloadDisabled,
	isDownloading = false,
	onBack,
	onShare,
	onDownload,
}: AssessmentReportResultsHeaderProps) {
	const isBackVariant = backVariant === "back";

	return (
		<div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
			<Button
				type="button"
				variant="outline"
				size={isBackVariant ? "default" : "lg"}
				className={cn(
					"shrink-0",
					!isBackVariant &&
						"rounded-xl text-destructive hover:bg-background hover:text-destructive",
				)}
				icon={isBackVariant ? ChevronLeft : X}
				aria-label={backLabel}
				onClick={onBack}
			>
				{backLabel}
			</Button>

			{showTitleAndSubtitle ? (
				<div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:pt-0.5">
					<h2 className="text-balance text-heading-3 font-semibold leading-heading-3 tracking-heading-2 text-text-foreground">
						{pageTitle}
					</h2>
					<p className="text-small font-normal leading-small text-muted-foreground">
						{completedSubtitle}
					</p>
				</div>
			) : (
				<div className="hidden min-w-0 flex-1 sm:block" aria-hidden />
			)}

			<div
				className={cn(
					"flex shrink-0 flex-wrap items-center gap-3 sm:pt-0.5",
					!showTitleAndSubtitle && "sm:ms-auto",
				)}
			>
				{showShare ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="rounded-xl"
						icon={Share2}
						aria-label={shareLabel}
						onClick={onShare}
					>
						{shareLabel}
					</Button>
				) : null}
				<Button
					type="button"
					variant="default"
					size="lg"
					className="rounded-xl"
					icon={Download}
					disabled={downloadDisabled}
					isLoading={isDownloading}
					aria-label={downloadLabel}
					onClick={onDownload}
				>
					{downloadLabel}
				</Button>
			</div>
		</div>
	);
}
