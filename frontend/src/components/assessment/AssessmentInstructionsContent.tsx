import {
	ArrowDownToLine,
	ArrowLeft,
	ArrowRight,
	Award,
	BadgeHelp,
	BadgeInfo,
	Frown,
	ListTodo,
	LogOut,
	MousePointer2,
	Smile,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ASSESSMENT_INSTRUCTIONS_CONTENT,
	SUBSCRIPTION_ACCESS_CONTENT,
} from "@/const";
import { useSubscriptionAccess } from "@/hooks";
import { isEndUserAssessmentIncomplete } from "@/lib";
import { cn } from "@/lib/utils";
import { useUsersStore } from "@/store";
import type { AssessmentInstructionsContentProps } from "@/types";
import { AssessmentLikertQuestionBlock } from "./AssessmentLikertQuestionBlock";

const criticalRuleIcons = [Award, ArrowDownToLine, MousePointer2] as const;
const criticalRuleIconClass = [
	"text-icon-info",
	"text-icon-secondary",
	"text-icon-warning",
] as const;

export function AssessmentInstructionsContent({
	onExit,
	onBackToIntro,
	onStartAssessment,
	hasInProgressSession,
}: AssessmentInstructionsContentProps) {
	const { scaleLabels } = ASSESSMENT_INSTRUCTIONS_CONTENT;
	const { userProfile } = useUsersStore();
	const { canStartAssessment } = useSubscriptionAccess();
	const showExitAssessment =
		userProfile &&
		!isEndUserAssessmentIncomplete(userProfile.assessmentCompletionCount);

	const [demoSelections, setDemoSelections] = useState<(number | null)[]>(
		() => [null, null, null, null],
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
					<ListTodo className="size-3.5 shrink-0" aria-hidden />
					<span className="text-mini font-medium leading-mini tracking-wide">
						{ASSESSMENT_INSTRUCTIONS_CONTENT.stepBadge}
					</span>
				</div>
				<div className="flex max-w-3xl flex-col items-center gap-4">
					<h1 className="max-w-4xl text-heading-2 font-medium leading-heading-2 tracking-heading-2 text-text-secondary">
						{ASSESSMENT_INSTRUCTIONS_CONTENT.title}
					</h1>
					<p className="max-w-xl text-regular font-normal leading-regular text-muted-foreground">
						{ASSESSMENT_INSTRUCTIONS_CONTENT.subtitle}
					</p>
				</div>
			</div>

			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-3.5">
				<div className="flex min-h-0 w-full shrink-0 flex-col gap-4 lg:w-96 lg:max-w-96">
					<div className="flex w-full shrink-0 flex-col gap-6 rounded-2xl border border-border bg-background px-6 pb-6 pt-8">
						<h2 className="text-heading-4 font-medium leading-heading-4 text-text-secondary">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.scaleCardTitle}
						</h2>
						<div className="flex w-full flex-col gap-5">
							{scaleLabels.map((item, index) => {
								const numberShell =
									index === 0
										? "bg-brand-secondary-bg text-interactive-secondary-hover"
										: index === 1
											? "bg-warning-bg text-interactive-warning-active"
											: "bg-brand-primary-bg text-brand-primary-text";
								return (
									<div
										key={item.value}
										className="flex w-full max-w-full items-center gap-5"
									>
										<div className="flex size-12 shrink-0 items-stretch justify-stretch">
											<div
												className={cn(
													"flex size-full min-h-9 items-center justify-center rounded-xl px-4 py-2",
													numberShell,
												)}
											>
												<span className="text-small font-medium leading-small">
													{item.value}
												</span>
											</div>
										</div>
										<div className="flex min-h-0 min-w-0 max-w-60 flex-1 flex-col gap-1">
											<p className="text-small font-medium leading-small tracking-wide text-text-secondary">
												{item.title}
											</p>
											<p className="text-mini font-normal leading-mini tracking-wide text-muted-foreground">
												{item.description}
											</p>
										</div>
									</div>
								);
							})}
						</div>
						<div className="flex w-full shrink-0 flex-col gap-2.5">
							<div className="flex items-center justify-between px-1.5 pb-1 text-small font-medium leading-small tracking-wide text-muted-foreground">
								<span>1</span>
								<span>5</span>
								<span>10</span>
							</div>
							<div
								className="h-2.5 w-full shrink-0 rounded-full bg-linear-to-r from-interactive-secondary-hover via-interactive-primary-disabled to-interactive-primary"
								aria-hidden
							/>
							<div className="flex items-center justify-between">
								<div className="flex items-end justify-center gap-1.5">
									<Frown
										className="size-5 shrink-0 text-interactive-secondary-hover"
										aria-hidden
									/>
									<span className="text-mini font-medium leading-mini tracking-wide text-interactive-secondary-hover">
										{ASSESSMENT_INSTRUCTIONS_CONTENT.scaleAxisLeast}
									</span>
								</div>
								<div className="flex items-end justify-center gap-1.5">
									<span className="text-mini font-medium leading-mini tracking-wide text-interactive-primary">
										{ASSESSMENT_INSTRUCTIONS_CONTENT.scaleAxisMost}
									</span>
									<Smile
										className="size-5 shrink-0 text-interactive-primary"
										aria-hidden
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex w-full shrink-0 flex-col gap-6 rounded-2xl border border-border bg-background px-6 pb-6 pt-8">
						<h2 className="text-heading-4 font-medium leading-heading-4 text-text-secondary">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.criticalRulesTitle}
						</h2>
						<div className="flex flex-col gap-4">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.criticalRules.flatMap(
								(rule, index) => {
									const Icon = criticalRuleIcons[index];
									const row = (
										<div key={rule.title} className="flex items-center gap-5">
											<Icon
												className={cn(
													"size-8 shrink-0",
													criticalRuleIconClass[index],
												)}
												aria-hidden
											/>
											<div className="flex min-w-0 flex-1 flex-col gap-1">
												<p className="text-small font-medium leading-small tracking-wide text-text-secondary">
													{rule.title}
												</p>
												<p className="text-mini font-normal leading-mini tracking-wide text-muted-foreground">
													{rule.description}
												</p>
											</div>
										</div>
									);
									if (index === 0) {
										return [row];
									}
									return [
										<div
											key={`rule-sep-${rule.title}`}
											className="h-px w-full shrink-0 bg-border"
											aria-hidden
										/>,
										row,
									];
								},
							)}
						</div>
					</div>

					<div className="flex w-full shrink-0 flex-col gap-6 rounded-2xl border border-border bg-background p-6">
						<h2 className="text-heading-4 font-medium leading-heading-4 text-text-secondary">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.importantNotesTitle}
						</h2>
						<div className="flex flex-col gap-4 px-1 py-2">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.importantNotes.map((note) => (
								<div key={note.emphasis} className="flex items-center gap-4">
									<BadgeInfo
										className="size-5 shrink-0 text-interactive-info"
										aria-hidden
									/>
									<p className="min-w-0 flex-1 text-small leading-small tracking-wide">
										<span className="font-normal text-muted-foreground">
											{note.lead}
										</span>
										<span className="font-medium text-text-secondary">
											{note.emphasis}
										</span>
										<span className="font-normal text-muted-foreground">
											{note.tail}
										</span>
									</p>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
					<div
						className="flex w-full shrink-0 items-center gap-2.5 rounded-2xl border border-border bg-background p-6"
						role="status"
					>
						<BadgeHelp
							className="size-7 shrink-0 text-icon-warning"
							aria-hidden
						/>
						<p className="min-w-0 flex-1 text-heading-4 leading-heading-4 text-text-foreground">
							<span className="font-normal">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.sectionsOverviewLead}
							</span>
							<span className="font-semibold">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.sectionsOverviewEmphasis}
							</span>
							<span className="font-normal">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.sectionsOverviewTail}
							</span>
						</p>
					</div>

					<div className="flex min-h-0 w-full flex-1 flex-col gap-5 rounded-2xl border border-border bg-background px-6 pb-6 pt-8">
						<div className="flex w-full items-center gap-3">
							<div className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary-bg p-2.5">
								<ListTodo
									className="size-6 text-interactive-primary"
									aria-hidden
								/>
							</div>
							<p className="min-w-0 flex-1 text-heading-4 font-medium leading-heading-4 text-text-secondary">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.demoTitle}
							</p>
						</div>
						<div className="flex flex-col gap-1.5">
							<p className="text-regular font-normal leading-regular text-text-secondary">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.demoHeading}
							</p>
							<p className="text-mini font-normal leading-mini tracking-wide text-muted-foreground">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.demoSubheading}
							</p>
						</div>

						<AssessmentLikertQuestionBlock
							instanceId="instructions-interactive-demo"
							questionNumber={1}
							questionText={ASSESSMENT_INSTRUCTIONS_CONTENT.demoQuestion}
							statements={ASSESSMENT_INSTRUCTIONS_CONTENT.demoStatements}
							selections={demoSelections}
							onScoreSelect={(row, value) => {
								setDemoSelections((prev) => {
									const next = [...prev];
									next[row] = value;
									return next;
								});
							}}
						/>
					</div>

					<div className="flex w-full shrink-0 flex-col gap-3 rounded-2xl bg-info p-6 text-light-same">
						<p className="text-heading-4 font-medium leading-heading-4">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.proTipTitle}
						</p>
						<p className="text-small font-normal leading-small tracking-wide">
							{ASSESSMENT_INSTRUCTIONS_CONTENT.proTipLead}
							<span className="font-medium">
								{ASSESSMENT_INSTRUCTIONS_CONTENT.proTipEmphasis}
							</span>
							{ASSESSMENT_INSTRUCTIONS_CONTENT.proTipTail}
						</p>
					</div>
				</div>
			</div>

			<div
				className={cn(
					"flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center",
					showExitAssessment ? "sm:justify-between" : "sm:justify-end",
				)}
			>
				{showExitAssessment ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						icon={LogOut}
						onClick={onExit}
					>
						{ASSESSMENT_INSTRUCTIONS_CONTENT.exitAssessment}
					</Button>
				) : null}
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
					<Button
						type="button"
						variant="outline"
						size="lg"
						icon={ArrowLeft}
						onClick={onBackToIntro}
					>
						{ASSESSMENT_INSTRUCTIONS_CONTENT.backToIntroSection}
					</Button>
					{!canStartAssessment ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex">
									<Button
										type="button"
										size="lg"
										icon={ArrowRight}
										iconPosition="end"
										disabled
										aria-label={
											SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip
										}
									>
										{hasInProgressSession
											? ASSESSMENT_INSTRUCTIONS_CONTENT.continueAssessment
											: ASSESSMENT_INSTRUCTIONS_CONTENT.startAssessment}
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="top">
								{SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip}
							</TooltipContent>
						</Tooltip>
					) : (
						<Button
							type="button"
							size="lg"
							icon={ArrowRight}
							iconPosition="end"
							onClick={onStartAssessment}
							aria-label={
								hasInProgressSession
									? ASSESSMENT_INSTRUCTIONS_CONTENT.continueAssessment
									: ASSESSMENT_INSTRUCTIONS_CONTENT.startAssessment
							}
						>
							{hasInProgressSession
								? ASSESSMENT_INSTRUCTIONS_CONTENT.continueAssessment
								: ASSESSMENT_INSTRUCTIONS_CONTENT.startAssessment}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
