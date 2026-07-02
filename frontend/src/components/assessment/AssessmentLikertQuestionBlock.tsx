import { AlertCircle, AlertTriangle, Check, Frown, Smile } from "lucide-react";
import { useMemo } from "react";
import { ASSESSMENT_INSTRUCTIONS_CONTENT } from "@/const";
import {
	getDuplicateFilledValues,
	hasDuplicateSelectionAmongFilled,
	isLikertRowScoreDisabled,
	isValidLikertSelection,
	LIKERT_SCORES,
} from "@/lib/assessmentLikert";
import { cn } from "@/lib/utils";
import type {
	AssessmentLikertQuestionBlockProps,
	DemoNoteWarningProps,
	DemoValidationPanelModel,
} from "@/types";

function getDemoValidationPanelModel(
	selections: readonly (number | null)[],
): DemoValidationPanelModel | null {
	if (selections.length !== 4) {
		return null;
	}
	const isComplete = selections.every((s) => s !== null);
	if (isComplete && isValidLikertSelection(selections)) {
		return null;
	}
	const showPillSameNumber = hasDuplicateSelectionAmongFilled(selections);
	if (!isComplete) {
		if (!showPillSameNumber) {
			return null;
		}
		return {
			showPill1And10Not: false,
			showPill1Not: false,
			showPill10Not: false,
			showPillSameNumber: true,
			middleFailed: false,
			count1: 0,
			count10: 0,
			allUnique: false,
		};
	}
	const values = selections as number[];
	const count1 = values.filter((v) => v === 1).length;
	const count10 = values.filter((v) => v === 10).length;
	const allUnique = new Set(values).size === values.length;
	const showPill1And10Not = count1 === 0 && count10 === 0;
	const showPill1Not = !showPill1And10Not && count1 === 0 && count10 > 0;
	const showPill10Not = !showPill1And10Not && count10 === 0 && count1 > 0;
	const middle = values.filter((v) => v !== 1 && v !== 10);
	const middleFailed =
		count1 === 1 &&
		count10 === 1 &&
		allUnique &&
		(middle.length !== 2 || !middle.every((n) => n >= 2 && n <= 9));
	return {
		showPill1And10Not,
		showPill1Not,
		showPill10Not,
		showPillSameNumber,
		middleFailed,
		count1,
		count10,
		allUnique,
	};
}

function DemoNoteWarning({ title, body, noteId }: DemoNoteWarningProps) {
	return (
		<div
			className="flex w-full items-start gap-3 rounded-xl bg-warning-bg p-4"
			role="alert"
			aria-live="assertive"
		>
			<AlertTriangle
				className="mt-0.5 size-4 shrink-0 text-icon-warning"
				strokeWidth={2}
				aria-hidden
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-px">
				{title ? (
					<p
						id={noteId}
						className="text-small font-bold leading-small text-warning-text"
					>
						{title}
					</p>
				) : null}
				<p
					id={title ? undefined : noteId}
					className="text-small font-normal leading-small text-text-foreground"
				>
					{body}
				</p>
			</div>
		</div>
	);
}

function demoPillClasses(
	selected: boolean,
	disabled: boolean,
	value: number,
	isDuplicateSelected: boolean,
): string {
	if (disabled) {
		return "cursor-not-allowed border border-input bg-card text-interactive-neutral";
	}
	if (selected) {
		if (isDuplicateSelected) {
			return "bg-interactive-warning-active text-light-same";
		}
		if (value === 1) {
			return "bg-interactive-neutral-active text-light-same";
		}
		return "bg-interactive-primary text-light-same";
	}
	return "bg-card text-text-secondary hover:bg-muted/80";
}

const c = ASSESSMENT_INSTRUCTIONS_CONTENT;

export function AssessmentLikertQuestionBlock({
	instanceId,
	questionNumber,
	questionText,
	statements: statementList,
	selections: demoSelections,
	onScoreSelect: onScoreSelectProp,
	padScaleEnd = false,
}: AssessmentLikertQuestionBlockProps) {
	const statements = statementList as readonly string[];
	const questionValid = useMemo(
		() => isValidLikertSelection(demoSelections),
		[demoSelections],
	);
	const demoValidationPanel = useMemo(
		() => getDemoValidationPanelModel(demoSelections),
		[demoSelections],
	);
	const duplicateFilledValues = useMemo(
		() => getDuplicateFilledValues(demoSelections),
		[demoSelections],
	);
	const qnaBoxClass = useMemo(() => {
		if (questionValid) {
			return "border border-border border-solid";
		}
		if (!demoValidationPanel) {
			return "border border-border border-solid";
		}
		const p = demoValidationPanel;
		if (p.showPill1And10Not || p.showPill1Not || p.showPill10Not) {
			return "border-2 border-destructive border-solid";
		}
		return "border-2 border-warning border-solid";
	}, [questionValid, demoValidationPanel]);

	const handleDemoScoreSelect = (rowIndex: number, value: number) => {
		if (isLikertRowScoreDisabled(demoSelections, rowIndex, value)) {
			return;
		}
		onScoreSelectProp(rowIndex, value);
	};

	return (
		<div
			className={cn(
				"flex w-full min-w-0 flex-col gap-8 rounded-xl bg-background p-6",
				qnaBoxClass,
			)}
		>
			<div className="flex flex-col gap-8">
				<div className="flex w-full min-w-0 items-start gap-5">
					<h3 className="flex min-w-0 flex-1 items-start gap-2 text-heading-3 font-semibold leading-heading-3 tracking-heading-2 text-text-foreground">
						<span className="shrink-0 tabular-nums">{questionNumber}.</span>
						<span className="min-w-0 flex-1 wrap-break-word">
							{questionText}
						</span>
					</h3>
					{questionValid ? (
						<div
							className="inline-flex h-8 shrink-0 items-center gap-2 self-start rounded-full bg-interactive-success px-3 py-2 text-light-same"
							role="status"
							aria-live="polite"
							aria-label={`${c.demoSuccessTitle}: ${c.demoSuccessBody}`}
						>
							<Check
								className="size-3.5 shrink-0"
								strokeWidth={2.5}
								aria-hidden
							/>
							<span className="whitespace-nowrap text-small font-semibold leading-small">
								{c.demoSuccessTitle}
							</span>
						</div>
					) : null}
					{!questionValid && demoValidationPanel ? (
						<div
							className="flex shrink-0 items-center gap-2 self-start"
							role="status"
						>
							{demoValidationPanel.showPillSameNumber ? (
								<div
									className="inline-flex h-8 items-center gap-2 rounded-full bg-interactive-warning-active px-3 py-2 text-light-same"
									role="alert"
									aria-live="assertive"
								>
									<AlertTriangle
										className="size-3.5 shrink-0"
										strokeWidth={2}
										aria-hidden
									/>
									<span className="whitespace-nowrap text-small font-semibold leading-small">
										{c.validationPillSameNumber}
									</span>
								</div>
							) : null}
							{demoValidationPanel.showPill1And10Not ? (
								<div
									className="inline-flex h-8 items-center gap-2 rounded-full bg-interactive-error px-3 py-2 text-light-same"
									role="alert"
									aria-live="assertive"
								>
									<AlertCircle
										className="size-3.5 shrink-0"
										strokeWidth={2}
										aria-hidden
									/>
									<span className="whitespace-nowrap text-small font-semibold leading-small">
										{c.validationPill1And10Not}
									</span>
								</div>
							) : null}
							{demoValidationPanel.showPill1Not ? (
								<div
									className="inline-flex h-8 items-center gap-2 rounded-full bg-interactive-error px-3 py-2 text-light-same"
									role="alert"
									aria-live="assertive"
								>
									<AlertCircle
										className="size-3.5 shrink-0"
										strokeWidth={2}
										aria-hidden
									/>
									<span className="whitespace-nowrap text-small font-semibold leading-small">
										{c.validationPill1Not}
									</span>
								</div>
							) : null}
							{demoValidationPanel.showPill10Not ? (
								<div
									className="inline-flex h-8 items-center gap-2 rounded-full bg-interactive-error px-3 py-2 text-light-same"
									role="alert"
									aria-live="assertive"
								>
									<AlertCircle
										className="size-3.5 shrink-0"
										strokeWidth={2}
										aria-hidden
									/>
									<span className="whitespace-nowrap text-small font-semibold leading-small">
										{c.validationPill10Not}
									</span>
								</div>
							) : null}
						</div>
					) : null}
				</div>
				{!questionValid && demoValidationPanel?.middleFailed ? (
					<DemoNoteWarning
						noteId={`${instanceId}-err-middle`}
						body={c.demoErrorMiddle2to9}
					/>
				) : null}

				<div className="flex flex-col gap-4">
					{statements.map((statement, rowIndex) => {
						const selected = demoSelections[rowIndex] ?? null;
						const rowShell =
							selected === 10
								? "rounded-2xl bg-brand-primary-bg p-4"
								: selected === 1
									? "rounded-2xl bg-brand-gray-bg p-4"
									: "rounded-2xl p-4";
						const tagMost = selected === 10 ? c.demoMostLikeLabel : null;
						const tagLeast = selected === 1 ? c.demoLeastLikeLabel : null;
						const rowTag = tagMost ?? tagLeast;
						return (
							<div
								key={`${instanceId}-row-${rowIndex}`}
								className={cn("flex flex-col gap-6", rowShell)}
							>
								<div
									className={cn(
										"flex w-full items-center gap-3",
										rowTag ? "justify-between" : "justify-start",
									)}
								>
									<p className="text-small font-normal leading-small tracking-wide text-text-foreground">
										{statement}
									</p>
									{rowTag ? (
										<div className="flex shrink-0 items-center gap-1 rounded-full py-0.5">
											{tagMost ? (
												<Smile
													className="size-3.5 shrink-0 text-brand-primary-text"
													strokeWidth={2}
													aria-hidden
												/>
											) : (
												<Frown
													className="size-3.5 shrink-0 text-interactive-neutral-active"
													strokeWidth={2}
													aria-hidden
												/>
											)}
											<span
												className={cn(
													"text-mini font-medium leading-mini tracking-wide",
													tagMost
														? "text-brand-primary-text"
														: "text-interactive-neutral-active",
												)}
											>
												{rowTag}
											</span>
										</div>
									) : null}
								</div>
								<div
									className={cn(
										"min-w-0 items-center gap-2.5",
										padScaleEnd
											? "flex flex-wrap"
											: "flex flex-wrap lg:grid lg:grid-cols-10 lg:gap-2.5",
									)}
									role="group"
									aria-label={statement}
								>
									{LIKERT_SCORES.map((value) => {
										const optionDisabled = isLikertRowScoreDisabled(
											demoSelections,
											rowIndex,
											value,
										);
										const isSelected = selected === value;
										const isDuplicateSelected =
											isSelected && duplicateFilledValues.has(value);
										const pillClassName = cn(
											"relative flex h-10 w-18 min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-full text-center text-regular font-semibold leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											!padScaleEnd && "lg:w-full",
											demoPillClasses(
												isSelected,
												optionDisabled,
												value,
												isDuplicateSelected,
											),
										);
										const label = optionDisabled
											? `${c.demoAriaSelectScore} ${value}, ${c.demoAriaDisabledTaken}`
											: `${c.demoAriaSelectScore} ${value} ${c.demoAriaForStatement} ${statement}`;

										const valueAndStrike = (
											<>
												{optionDisabled ? (
													<span
														className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-full"
														aria-hidden
													>
														<span className="absolute h-px w-[140%] -rotate-45 bg-border" />
													</span>
												) : null}
												<span className="relative z-0 tabular-nums">
													{value}
												</span>
											</>
										);

										if (!optionDisabled) {
											return (
												<button
													key={`${instanceId}-r${rowIndex}-v${value}`}
													type="button"
													aria-pressed={isSelected}
													aria-label={label}
													onClick={() => handleDemoScoreSelect(rowIndex, value)}
													className={pillClassName}
												>
													{valueAndStrike}
												</button>
											);
										}
										return (
											<span
												key={`${instanceId}-r${rowIndex}-v${value}`}
												className={cn(
													"inline-flex h-10 w-18 min-w-0 shrink-0 focus-visible:outline-none",
													!padScaleEnd && "lg:w-full",
													"cursor-not-allowed items-center justify-center",
												)}
											>
												<button
													type="button"
													disabled
													aria-pressed={isSelected}
													aria-label={label}
													className={pillClassName}
												>
													{valueAndStrike}
												</button>
											</span>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
