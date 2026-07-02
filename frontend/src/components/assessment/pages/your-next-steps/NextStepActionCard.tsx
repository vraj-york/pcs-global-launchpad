import { ArrowRight, Share2, Users } from "lucide-react";
import type { MouseEvent } from "react";
import { AssessmentReportPanel } from "@/components";
import type { NextStepActionCardProps, NextStepCardIconKey } from "@/types";

const CARD_ICONS: Record<NextStepCardIconKey, typeof Users> = {
	users: Users,
	"share-2": Share2,
};

const shareCtaClassName =
	"inline-flex min-h-9 cursor-pointer items-center gap-2 py-2 text-link";

export function NextStepActionCard({
	card,
	icon,
	ctaLabel,
	showCta = true,
	usesShareHandler = false,
	shareReportHref,
	onShare,
}: NextStepActionCardProps) {
	const Icon = CARD_ICONS[icon];
	const hasExternalLink = card.link.length > 0;

	const handleShareClick = (event: MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		onShare?.();
	};

	const handleCtaClick = () => {
		if (usesShareHandler && onShare) {
			onShare();
		}
	};

	const ctaContent = (
		<>
			<span className="text-mini font-semibold leading-mini tracking-wide underline">
				{ctaLabel}
			</span>
			<ArrowRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
		</>
	);

	const renderCta = () => {
		if (usesShareHandler) {
			if (shareReportHref) {
				return (
					<a
						href={shareReportHref}
						onClick={handleShareClick}
						className={shareCtaClassName}
						aria-label={ctaLabel}
						data-assessment-share-report-link
					>
						{ctaContent}
					</a>
				);
			}

			return (
				<button
					type="button"
					className={shareCtaClassName}
					onClick={handleCtaClick}
					aria-label={ctaLabel}
				>
					{ctaContent}
				</button>
			);
		}

		if (hasExternalLink) {
			return (
				<a
					href={card.link}
					target="_blank"
					rel="noopener noreferrer"
					className={shareCtaClassName}
				>
					{ctaContent}
				</a>
			);
		}

		return (
			<button
				type="button"
				className={shareCtaClassName}
				onClick={handleCtaClick}
				aria-label={ctaLabel}
			>
				{ctaContent}
			</button>
		);
	};

	return (
		<AssessmentReportPanel
			as="article"
			padding="md"
			className="flex min-w-0 flex-1 flex-col gap-3"
		>
			<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-bg p-2.5">
				<Icon
					className="size-5 shrink-0 text-info"
					strokeWidth={2}
					aria-hidden
				/>
			</div>
			<h3 className="text-regular font-semibold leading-regular text-foreground">
				{card.title}
			</h3>
			<p className="text-small font-normal leading-small tracking-wide text-text-secondary">
				{card.description}
			</p>
			{showCta ? renderCta() : null}
		</AssessmentReportPanel>
	);
}
