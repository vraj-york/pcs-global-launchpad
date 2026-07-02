import { HandHeart } from "lucide-react";
import { AssessmentReportPanel } from "@/components";
import {
	ASSESSMENT_REPORT_INTRO_SECTION,
	ASSESSMENT_REPORT_INTRO_VIDEO,
	ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID,
	ASSESSMENT_REPORT_RESULTS_PAGE,
	ASSESSMENT_REPORT_VIEW,
	formatAssessmentReportWelcomeGreeting,
} from "@/const";
import type { AssessmentReportBehavioralAssessmentProps } from "@/types";
import { buildYoutubeUrl } from "@/utils";
import { WelcomeIntroCard } from ".";

export function BehavioralAssessment({
	welcomeDisplayName,
	welcomeParagraphs,
}: AssessmentReportBehavioralAssessmentProps) {
	return (
		<section
			id={ASSESSMENT_REPORT_RESULTS_PAGE.primarySectionId}
			className={ASSESSMENT_REPORT_RESULTS_PAGE.sectionShellClassName}
		>
			<header className="flex w-full min-w-0 flex-col gap-2">
				<p className="text-regular font-semibold leading-regular text-muted-foreground">
					{formatAssessmentReportWelcomeGreeting(welcomeDisplayName)}
				</p>
				<h1 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
					{ASSESSMENT_REPORT_VIEW.introTitle}
				</h1>
			</header>

			<div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4 xl:justify-center">
				<div className="flex w-full min-w-0 shrink-0 flex-col gap-4 lg:max-w-md lg:min-h-0 lg:self-stretch xl:w-110 xl:max-w-110">
					<div className="flex min-h-0 flex-col lg:flex-1 lg:min-h-0">
						<WelcomeIntroCard paragraphs={welcomeParagraphs} />
					</div>
					<AssessmentReportPanel
						variant="info"
						padding="lg"
						className="flex w-full min-w-0 shrink-0 flex-col gap-6"
					>
						<div
							className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-info p-1 text-light-same"
							aria-hidden
						>
							<HandHeart className="size-9" strokeWidth={1.75} />
						</div>
						<p className="text-regular font-semibold leading-regular text-link">
							{ASSESSMENT_REPORT_INTRO_SECTION.thankYouBody}
						</p>
					</AssessmentReportPanel>
				</div>

				<div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:min-w-0 xl:w-134 xl:max-w-134 xl:shrink-0">
					<div
						className="relative aspect-video w-full min-w-0 shrink-0 overflow-hidden rounded-xl"
						role="region"
						aria-label={ASSESSMENT_REPORT_INTRO_VIDEO.embedTitle}
						aria-describedby="report-intro-video-desc"
					>
						<p className="sr-only" id="report-intro-video-desc">
							{ASSESSMENT_REPORT_INTRO_VIDEO.embedDescription}
						</p>
						<iframe
							title={ASSESSMENT_REPORT_INTRO_VIDEO.embedTitle}
							className="absolute inset-0 size-full border-0"
							src={buildYoutubeUrl(
								ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID,
								"embed",
							)}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
							allowFullScreen
							referrerPolicy="strict-origin-when-cross-origin"
						/>
					</div>

					<AssessmentReportPanel
						variant="filled"
						padding="lg"
						className="flex w-full min-w-0 shrink-0 flex-col gap-0"
					>
						<p className="text-regular font-medium leading-regular text-text-foreground">
							{ASSESSMENT_REPORT_INTRO_SECTION.goalBody}
						</p>
					</AssessmentReportPanel>

					<AssessmentReportPanel
						padding="lg"
						className="flex w-full min-w-0 shrink-0 flex-col gap-6"
					>
						<p className="text-regular font-normal leading-regular text-text-foreground">
							{ASSESSMENT_REPORT_INTRO_SECTION.awarenessLeadIn}
						</p>
						<div className="flex flex-col gap-3">
							<div className="flex items-start gap-2">
								<span
									className="flex size-5 shrink-0 items-center justify-center rounded-full bg-info text-mini font-semibold leading-none text-light-same"
									aria-hidden
								>
									1
								</span>
								<p className="min-w-0 flex-1 text-regular font-semibold leading-regular text-link">
									{ASSESSMENT_REPORT_INTRO_SECTION.question1}
								</p>
							</div>
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<span
									className="flex size-5 shrink-0 items-center justify-center rounded-full bg-info text-mini font-semibold leading-none text-light-same"
									aria-hidden
								>
									2
								</span>
								<p className="min-w-0 flex-1 text-regular font-semibold leading-regular text-link">
									{ASSESSMENT_REPORT_INTRO_SECTION.question2}
								</p>
							</div>
						</div>
						<p className="text-regular font-normal leading-regular text-text-foreground">
							{ASSESSMENT_REPORT_INTRO_SECTION.awarenessClosing}
						</p>
					</AssessmentReportPanel>
				</div>
			</div>
		</section>
	);
}
