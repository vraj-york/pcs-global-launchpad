import {
	AssessmentReportPanel,
	AssessmentReportPrintLayout,
	AssessmentReportPrintVideoCard,
	WagonWheel,
} from "@/components";
import {
	ASSESSMENT_REPORT_INTRO_SECTION,
	ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS,
	ASSESSMENT_REPORT_VIEW,
	ASSESSMENT_REPORT_WELCOME_WAGON_WHEEL,
	formatAssessmentReportWelcomeGreeting,
} from "@/const";
import type { AssessmentReportPrintIntroPageOneProps } from "@/types";

const wheel = ASSESSMENT_REPORT_WELCOME_WAGON_WHEEL;

export function AssessmentReportPrintIntroPageOne({
	welcomeDisplayName,
	welcomeParagraphs,
}: AssessmentReportPrintIntroPageOneProps) {
	const shown = welcomeParagraphs.slice(
		0,
		ASSESSMENT_REPORT_VIEW.introParagraphCount,
	);

	return (
		<AssessmentReportPrintLayout
			pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.introOne}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
				<header className="flex shrink-0 flex-col gap-2">
					<p className="text-regular font-semibold leading-regular text-muted-foreground">
						{formatAssessmentReportWelcomeGreeting(welcomeDisplayName)}
					</p>
					<h1 className="text-heading-3 font-semibold leading-heading-3 tracking-heading-3 text-text-foreground">
						{ASSESSMENT_REPORT_VIEW.introTitle}
					</h1>
				</header>

				<div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2.5 overflow-hidden">
					<div className="flex h-full min-h-0 w-92 shrink-0 flex-col justify-start">
						<AssessmentReportPanel
							variant="bordered"
							padding="none"
							className="relative flex min-h-full w-full flex-col items-start gap-2 overflow-hidden rounded-xl px-4 pb-4 pt-3"
						>
							<div className={wheel.printWatermarkOverlayClassName} aria-hidden>
								<div className={wheel.printWatermarkClassName}>
									<WagonWheel {...wheel.props} className="size-full" />
								</div>
							</div>
							<WagonWheel
								{...wheel.props}
								className={wheel.printIconClassName}
								ariaLabel={ASSESSMENT_REPORT_VIEW.welcomeWheelImageAlt}
							/>
							<div className="relative z-10 flex w-full shrink-0 flex-col gap-2">
								{shown.map((para, index) => (
									<p
										key={`print-intro-p1-${index}`}
										className="text-regular font-normal leading-regular text-text-foreground"
									>
										{para}
									</p>
								))}
							</div>
						</AssessmentReportPanel>
					</div>

					<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center gap-2.5 overflow-hidden">
						<AssessmentReportPrintVideoCard />
						<AssessmentReportPanel
							variant="filled"
							padding="none"
							className="flex min-h-0 w-full flex-1 flex-col justify-center rounded-xl p-5"
						>
							<p className="text-regular font-medium leading-regular text-text-foreground">
								{ASSESSMENT_REPORT_INTRO_SECTION.goalBody}
							</p>
						</AssessmentReportPanel>
					</div>
				</div>
			</div>
		</AssessmentReportPrintLayout>
	);
}
