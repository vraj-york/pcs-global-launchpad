import { CircleCheck, Play } from "lucide-react";
import { ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS } from "@/const";
import { cn } from "@/lib";
import type {
	CommunicationColorCardProps,
	CommunicationEffectivenessColorKey,
} from "@/types";
import { buildYoutubeUrl, parseYoutubeVideoId } from "@/utils";

const sectionCopy = ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS;

function renderCommunicationCardHeader(
	header: string,
	colorKey: CommunicationEffectivenessColorKey,
	className: string,
) {
	const traitLabel = colorKey.toUpperCase();
	const traitIndex = header.toUpperCase().indexOf(traitLabel);

	if (traitIndex === -1) {
		return <p className={className}>{header}</p>;
	}

	const traitLabelClassName = sectionCopy.cards[colorKey].traitLabelClassName;

	return (
		<p className={className}>
			{header.slice(0, traitIndex)}
			<span className={traitLabelClassName}>
				{header.slice(traitIndex, traitIndex + traitLabel.length)}
			</span>
			{header.slice(traitIndex + traitLabel.length)}
		</p>
	);
}

export function CommunicationColorCard({
	colorKey,
	header,
	bullets,
	thumbnailUrl,
	youtubeVideoId,
	variant = "default",
}: CommunicationColorCardProps) {
	const isPrint = variant === "print";
	const cardCopy = sectionCopy.cards[colorKey];
	const resolvedVideoId = youtubeVideoId?.trim() || null;
	const watchUrl = resolvedVideoId
		? buildYoutubeUrl(resolvedVideoId, "watch")
		: null;
	const surfaceClassName = cn(
		isPrint
			? cn(
					"flex h-full min-h-0 min-w-0 flex-col gap-4 rounded-xl border p-5",
					cardCopy.printSurfaceClassName,
				)
			: cn(
					"flex h-full min-w-0 flex-1 flex-col rounded-xl border gap-5 p-6",
					cardCopy.surfaceClassName,
				),
	);
	const hasVideo = Boolean(resolvedVideoId);
	const displayBullets = isPrint
		? bullets.filter((bullet) => parseYoutubeVideoId(bullet) === null)
		: bullets;
	const resolvedThumbnailUrl =
		isPrint && resolvedVideoId
			? buildYoutubeUrl(resolvedVideoId, "thumbnail")
			: (thumbnailUrl ??
				(resolvedVideoId
					? buildYoutubeUrl(resolvedVideoId, "thumbnail")
					: null));

	const cardBody = (
		<>
			<div
				className={cn(
					isPrint
						? "relative flex h-[127px] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg"
						: "relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg",
				)}
			>
				{resolvedThumbnailUrl ? (
					<img
						alt=""
						loading="eager"
						decoding="sync"
						data-print-cover-image={isPrint ? true : undefined}
						className={
							isPrint
								? "absolute inset-0 size-full object-cover object-center print:object-cover print:object-center"
								: "absolute inset-0 size-full object-cover object-center"
						}
						src={resolvedThumbnailUrl}
					/>
				) : (
					<div className="absolute inset-0 bg-muted" aria-hidden />
				)}
				<div className="absolute inset-0 bg-black/70" aria-hidden />
				<span
					className={cn(
						"relative z-10",
						isPrint
							? "flex size-8 shrink-0 items-center justify-center rounded-full bg-background p-2"
							: sectionCopy.videoThumbnailPlayButtonClassName,
					)}
					aria-hidden
				>
					<Play
						className={
							isPrint
								? "size-4 fill-info text-info"
								: sectionCopy.videoThumbnailPlayIconClassName
						}
						strokeWidth={0}
						aria-hidden
					/>
				</span>
				<span className="sr-only">{sectionCopy.playThumbnailAriaLabel}</span>
			</div>

			{header ? (
				isPrint ? (
					renderCommunicationCardHeader(
						header,
						colorKey,
						"text-small font-semibold leading-small text-foreground",
					)
				) : (
					<p className="text-regular font-semibold leading-regular text-foreground">
						{header}
					</p>
				)
			) : null}

			{displayBullets.length > 0 ? (
				<ul
					className={cn(
						isPrint ? "flex flex-col gap-2.5" : "flex flex-col gap-3",
					)}
				>
					{displayBullets.map((bullet) => (
						<li
							key={bullet}
							className={
								isPrint ? "flex items-start gap-2" : "flex items-start gap-1.5"
							}
						>
							<CircleCheck
								className={cn(
									isPrint
										? "mt-0.5 size-3.5 shrink-0"
										: "mt-0.5 size-4 shrink-0",
									cardCopy.checkIconClassName,
								)}
								strokeWidth={2}
								aria-hidden
							/>
							<span
								className={cn(
									isPrint
										? "min-w-0 flex-1 text-mini font-medium leading-mini text-text-secondary"
										: "min-w-0 flex-1 text-small font-medium leading-small text-text-secondary",
								)}
							>
								{bullet}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</>
	);

	if (hasVideo && watchUrl) {
		return (
			<a
				href={watchUrl}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(
					surfaceClassName,
					"cursor-pointer no-underline outline-none transition-opacity hover:opacity-95",
					"focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2",
				)}
				aria-label={sectionCopy.openColorVideoAriaLabel(colorKey)}
			>
				{cardBody}
			</a>
		);
	}

	return <article className={surfaceClassName}>{cardBody}</article>;
}
