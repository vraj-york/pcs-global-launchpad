import { HandHeart } from "lucide-react";
import {
	AssessmentReportPanel,
	AssessmentReportPrintLayout,
} from "@/components";
import {
	ASSESSMENT_REPORT_INTRO_SECTION,
	ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS,
} from "@/const";

const introQuestions = [
	ASSESSMENT_REPORT_INTRO_SECTION.question1,
	ASSESSMENT_REPORT_INTRO_SECTION.question2,
] as const;

export function AssessmentReportPrintIntroPageTwo() {
	return (
		<AssessmentReportPrintLayout
			pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.introTwo}
		>
			<div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2.5 overflow-hidden">
				<AssessmentReportPanel
					variant="info"
					padding="lg"
					className="flex min-h-0 min-w-0 flex-1 flex-col gap-6"
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

				<AssessmentReportPanel
					padding="lg"
					className="flex min-h-0 min-w-0 flex-1 flex-col gap-6"
				>
					<p className="text-regular font-normal leading-regular text-text-foreground">
						{ASSESSMENT_REPORT_INTRO_SECTION.awarenessLeadIn}
					</p>
					<div className="flex flex-col gap-3">
						{introQuestions.map((question, index) => (
							<div key={question} className="flex items-start gap-2">
								<span
									className="flex size-5 shrink-0 items-center justify-center rounded-full bg-info text-mini font-semibold leading-none text-light-same"
									aria-hidden
								>
									{index + 1}
								</span>
								<p className="min-w-0 flex-1 text-regular font-semibold leading-regular text-link">
									{question}
								</p>
							</div>
						))}
					</div>
					<p className="text-regular font-normal leading-regular text-text-foreground">
						{ASSESSMENT_REPORT_INTRO_SECTION.awarenessClosing}
					</p>
				</AssessmentReportPanel>
			</div>
		</AssessmentReportPrintLayout>
	);
}
