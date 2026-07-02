import {
	ArrowRight,
	BookA,
	CircleCheckBig,
	Lightbulb,
	LogOut,
	Play,
	Save,
	Shield,
	SquareCheckBig,
	TrendingUp,
	Users,
	Video,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENT_INTRO_CONTENT,
	ASSESSMENT_INTRO_VIDEO_MODAL,
	ASSESSMENT_INTRO_YOUTUBE_VIDEO_ID,
} from "@/const";
import { isEndUserAssessmentIncomplete } from "@/lib";
import { cn } from "@/lib/utils";
import { useUsersStore } from "@/store";
import type { AssessmentIntroContentProps } from "@/types";
import { buildYoutubeUrl } from "@/utils";

const howToAnswerIcons = [SquareCheckBig, BookA, Save] as const;
const howToAnswerIconClass = [
	"text-success",
	"text-info",
	"text-warning",
] as const;

const sidebarHeaderConfig = [
	{ Icon: TrendingUp, headerBg: "bg-info-bg", iconClass: "text-info" },
	{ Icon: Users, headerBg: "bg-success-bg", iconClass: "text-success" },
	{
		Icon: Shield,
		headerBg: "bg-brand-gray-bg",
		iconClass: "text-interactive-neutral-active",
	},
] as const;

const sidebarListCheckClass = [
	"text-info",
	"text-success",
	"text-interactive-neutral-active",
] as const;

export function AssessmentIntroContent({
	onExit,
	onContinueToInstructions,
}: AssessmentIntroContentProps) {
	const { userProfile } = useUsersStore();
	const showExitAssessment =
		userProfile &&
		!isEndUserAssessmentIncomplete(userProfile.assessmentCompletionCount);
	const [videoPlaying, setVideoPlaying] = useState(false);

	const handleStartPlay = useCallback(() => {
		setVideoPlaying(true);
	}, []);

	const handleVideoThumbKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				setVideoPlaying(true);
			}
		},
		[],
	);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-8">
			<div className="flex flex-col items-center gap-6 text-center">
				<div
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
						"bg-info text-light-same",
					)}
				>
					<Video className="size-3.5 shrink-0" aria-hidden />
					<span className="text-mini font-semibold leading-mini tracking-wide">
						{ASSESSMENT_INTRO_CONTENT.stepBadge}
					</span>
				</div>
				<div className="flex max-w-3xl flex-col items-center gap-4">
					<h1 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{ASSESSMENT_INTRO_CONTENT.title}
					</h1>
					<p className="max-w-2xl text-regular leading-regular text-text-secondary">
						{ASSESSMENT_INTRO_CONTENT.subtitle}
					</p>
				</div>
			</div>

			<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-3.5">
				<div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:max-w-2xl lg:min-h-0">
					<div
						className={cn(
							"relative w-full overflow-hidden rounded-xl",
							"aspect-video",
							"lg:aspect-auto lg:h-80 lg:max-h-80 lg:shrink-0",
						)}
						{...(videoPlaying
							? {
									role: "region" as const,
									"aria-label": ASSESSMENT_INTRO_VIDEO_MODAL.embedTitle,
									"aria-describedby": "intro-video-desc",
								}
							: {})}
					>
						{videoPlaying ? (
							<>
								<p className="sr-only" id="intro-video-desc">
									{ASSESSMENT_INTRO_VIDEO_MODAL.embedDescription}
								</p>
								<iframe
									title={ASSESSMENT_INTRO_VIDEO_MODAL.embedTitle}
									className="absolute inset-0 size-full rounded-xl border-0"
									src={buildYoutubeUrl(
										ASSESSMENT_INTRO_YOUTUBE_VIDEO_ID,
										"embed",
									)}
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
									allowFullScreen
									referrerPolicy="strict-origin-when-cross-origin"
								/>
							</>
						) : (
							<div
								role="button"
								tabIndex={0}
								aria-label={ASSESSMENT_INTRO_VIDEO_MODAL.openVideoCard}
								aria-expanded={false}
								onClick={handleStartPlay}
								onKeyDown={handleVideoThumbKeyDown}
								className="relative size-full min-h-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<img
									src={`https://img.youtube.com/vi/${ASSESSMENT_INTRO_YOUTUBE_VIDEO_ID}/maxresdefault.jpg`}
									alt=""
									className="absolute inset-0 size-full object-cover"
								/>
								<div
									className="absolute inset-0 rounded-xl bg-linear-to-b from-overlay/60 via-black/60 to-black/60"
									aria-hidden
								/>
								<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 py-12 text-center">
									<span
										className="flex size-16 shrink-0 items-center justify-center rounded-full bg-background shadow-md"
										aria-hidden
									>
										<Play
											className="ml-0.5 size-6 fill-primary text-primary"
											aria-hidden
										/>
									</span>
									<div className="flex flex-col gap-2">
										<p className="text-heading-4 font-semibold leading-heading-4 text-light-same">
											{ASSESSMENT_INTRO_CONTENT.videoTitle}
										</p>
										<p className="text-small leading-small text-light-same/70">
											{ASSESSMENT_INTRO_CONTENT.videoSubtitle}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-col gap-6 rounded-2xl border border-border bg-background p-6">
						<h2 className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
							{ASSESSMENT_INTRO_CONTENT.howToAnswerTitle}
						</h2>
						<div className="flex flex-col gap-4">
							{ASSESSMENT_INTRO_CONTENT.howToAnswerItems.map((item, index) => {
								const Icon = howToAnswerIcons[index];
								return (
									<div key={item.title}>
										{index > 0 ? (
											<div className="mb-4 h-px w-full bg-border" aria-hidden />
										) : null}
										<div className="flex gap-5">
											<Icon
												className={cn(
													"size-8 shrink-0",
													howToAnswerIconClass[index],
												)}
												strokeWidth={1.75}
												aria-hidden
											/>
											<div className="flex min-w-0 flex-1 flex-col gap-1">
												<p className="text-small font-semibold leading-small text-text-secondary">
													{item.title}
												</p>
												<p className="text-mini font-medium leading-mini text-muted-foreground">
													{item.description}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
						<div className="flex gap-3 rounded-xl bg-info-bg p-4">
							<Lightbulb
								className="mt-0.5 size-4 shrink-0 text-info-text"
								aria-hidden
							/>
							<div className="flex min-w-0 flex-1 flex-col gap-px">
								<p className="text-small font-bold leading-small text-info-text">
									{ASSESSMENT_INTRO_CONTENT.importantTipLabel}
								</p>
								<p className="text-small font-normal leading-small text-text-foreground">
									{ASSESSMENT_INTRO_CONTENT.importantTipBody}
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex w-full min-w-0 flex-col gap-4 lg:min-h-0 lg:w-md lg:max-w-md lg:shrink-0">
					{ASSESSMENT_INTRO_CONTENT.sidebarCards.map((card, cardIndex) => {
						const { Icon, headerBg, iconClass } =
							sidebarHeaderConfig[cardIndex];
						const checkClass = sidebarListCheckClass[cardIndex];
						return (
							<div
								key={card.title}
								className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 lg:min-h-0 lg:flex-1"
							>
								<div className="flex shrink-0 items-center gap-5">
									<div
										className={cn(
											"flex size-9 shrink-0 items-center justify-center rounded-lg p-2",
											headerBg,
										)}
									>
										<Icon
											className={cn("size-4 shrink-0 fill-none", iconClass)}
											strokeWidth={2}
											aria-hidden
										/>
									</div>
									<h2 className="min-w-0 flex-1 text-heading-4 font-semibold leading-heading-4 text-text-foreground">
										{card.title}
									</h2>
								</div>
								<ul className="flex flex-col gap-2 px-1 py-2 lg:min-h-0 lg:flex-1 lg:justify-center">
									{card.items.map((line) => (
										<li key={line} className="flex items-center gap-4">
											<CircleCheckBig
												className={cn("size-5 shrink-0 fill-none", checkClass)}
												strokeWidth={2}
												aria-hidden
											/>
											<span className="min-w-0 flex-1 text-left text-small leading-small text-text-secondary">
												{line}
											</span>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			</div>

			<div
				className={cn(
					"mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center",
					showExitAssessment ? "sm:justify-between" : "sm:justify-end",
				)}
			>
				{showExitAssessment ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="h-10 rounded-xl px-6"
						icon={LogOut}
						onClick={onExit}
					>
						{ASSESSMENT_INTRO_CONTENT.exitAssessment}
					</Button>
				) : null}
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
					<Button
						type="button"
						size="lg"
						className="h-10 rounded-xl px-6"
						icon={ArrowRight}
						iconPosition="end"
						onClick={onContinueToInstructions}
					>
						{ASSESSMENT_INTRO_CONTENT.continueToInstructions}
					</Button>
				</div>
			</div>
		</div>
	);
}
