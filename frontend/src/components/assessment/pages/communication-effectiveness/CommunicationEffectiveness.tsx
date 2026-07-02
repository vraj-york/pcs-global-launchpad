import {
	AssessmentReportPanel,
	AssessmentReportSection,
	CommunicationColorCard,
} from "@/components";
import {
	ASSESSMENT_REPORT_COMMUNICATION_CARD_ORDER,
	ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS,
} from "@/const";
import { cn } from "@/lib";
import type { CommunicationEffectivenessProps } from "@/types";

const sectionCopy = ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS;

export function CommunicationEffectiveness({
	content,
	variant = "default",
}: CommunicationEffectivenessProps) {
	const isPrint = variant === "print";

	return (
		<AssessmentReportSection
			id={sectionCopy.sectionId}
			title={sectionCopy.sectionTitle}
			headerClassName={isPrint ? "shrink-0" : undefined}
		>
			<div className={cn(isPrint && "flex min-h-0 flex-1 flex-col gap-3.5")}>
				{content.icdetails ? (
					<AssessmentReportPanel
						variant="filled"
						padding={isPrint ? "none" : "lg"}
						className={cn(
							isPrint
								? "w-full shrink-0 rounded-2xl p-5"
								: "w-full shrink-0 min-w-0",
						)}
					>
						<p
							className={cn(
								isPrint
									? "text-regular font-medium leading-regular text-foreground"
									: "text-regular font-medium leading-regular text-text-foreground",
							)}
						>
							{content.icdetails}
						</p>
					</AssessmentReportPanel>
				) : null}

				<div
					className={cn(
						"grid w-full min-w-0",
						isPrint
							? "grid min-h-0 w-full min-w-0 flex-1 grid-cols-3 items-stretch gap-[13px]"
							: "grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch",
					)}
				>
					{ASSESSMENT_REPORT_COMMUNICATION_CARD_ORDER.map((colorKey) => {
						const card = content[colorKey];
						return (
							<CommunicationColorCard
								key={colorKey}
								colorKey={colorKey}
								header={card.header}
								bullets={card.bullets}
								thumbnailUrl={card.thumbnailUrl}
								youtubeVideoId={card.youtubeVideoId}
								variant={variant}
							/>
						);
					})}
				</div>
			</div>
		</AssessmentReportSection>
	);
}
