import { AssessmentReportPanel } from "@/components";
import { WagonWheel } from "@/components/common";
import {
	ASSESSMENT_REPORT_VIEW,
	ASSESSMENT_REPORT_WELCOME_WAGON_WHEEL,
} from "@/const";
import type { AssessmentReportWelcomeIntroCardProps } from "@/types";

const wheel = ASSESSMENT_REPORT_WELCOME_WAGON_WHEEL;
const wheelAriaLabel = ASSESSMENT_REPORT_VIEW.welcomeWheelImageAlt;

export function WelcomeIntroCard({
	paragraphs,
}: AssessmentReportWelcomeIntroCardProps) {
	const max = ASSESSMENT_REPORT_VIEW.introParagraphCount;
	const shown = paragraphs.slice(0, max);

	return (
		<AssessmentReportPanel
			padding="lg"
			className="relative flex w-full min-w-0 flex-col items-start overflow-clip lg:min-h-0 lg:flex-1"
		>
			<div className={wheel.watermarkWrapperClassName} aria-hidden>
				<WagonWheel {...wheel.props} className="size-full" />
			</div>
			<div className="relative z-10 flex w-full flex-col items-start gap-6 lg:min-h-0 lg:flex-1">
				<WagonWheel
					{...wheel.props}
					className={wheel.iconClassName}
					ariaLabel={wheelAriaLabel}
				/>
				<div className="flex w-full flex-col items-start gap-6">
					{shown.map((para, i) => (
						<p
							key={`welcome-intro-${i}`}
							className="text-regular font-normal leading-regular text-text-foreground"
						>
							{para}
						</p>
					))}
				</div>
				<div
					className="min-h-16 w-full shrink-0 lg:min-h-20 lg:flex-1"
					aria-hidden
				/>
			</div>
		</AssessmentReportPanel>
	);
}
