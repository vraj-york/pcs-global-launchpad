import { ArrowLeft, ArrowRight, BellRing, Check, Save } from "lucide-react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ASSESSMENT_LIKERT_SIGNATURE_DELIMITER,
	ASSESSMENT_LIKERT_SIGNATURE_INVALID,
	ASSESSMENT_QUESTIONS_PER_SECTION,
	ASSESSMENT_SECTION_COUNT,
	ASSESSMENT_SESSION,
	ROUTES,
} from "@/const";
import { useDebounce } from "@/hooks";
import { isEndUserAssessmentIncomplete } from "@/lib";
import { isApiError } from "@/lib/apiClient";
import { isValidLikertSelection } from "@/lib/assessmentLikert";
import { cn } from "@/lib/utils";
import { useAssessmentStore, useUsersStore } from "@/store";
import type {
	ApiQuestionOption,
	ApiQuestionResponseItem,
	ApiQuestionWithOptions,
	AssessmentSessionContentProps,
	ScoreState,
} from "@/types";
import { AssessmentLikertQuestionBlock } from "./AssessmentLikertQuestionBlock";

function sortOptions(opts: ApiQuestionOption[]): ApiQuestionOption[] {
	return [...opts].sort((a, b) => a.display_order - b.display_order);
}

function splitQuestionSections(ordered: ApiQuestionWithOptions[]) {
	if (
		ordered.length <
		ASSESSMENT_SECTION_COUNT * ASSESSMENT_QUESTIONS_PER_SECTION
	) {
		return null;
	}
	return Array.from({ length: ASSESSMENT_SECTION_COUNT }, (_, s) =>
		ordered.slice(
			s * ASSESSMENT_QUESTIONS_PER_SECTION,
			s * ASSESSMENT_QUESTIONS_PER_SECTION + ASSESSMENT_QUESTIONS_PER_SECTION,
		),
	);
}

function emptyScoresForQuestion() {
	return [null, null, null, null] as (number | null)[];
}

function likertSelectionSignature(
	selections: readonly (number | null)[],
): string {
	if (!isValidLikertSelection(selections)) {
		return ASSESSMENT_LIKERT_SIGNATURE_INVALID;
	}
	return (selections as number[]).join(ASSESSMENT_LIKERT_SIGNATURE_DELIMITER);
}

export function AssessmentSessionContent({
	assessmentId,
	persistenceEnabled = true,
	questions: allQuestions,
	onBackToInstructions,
	onAssessmentComplete,
	sessionInitial = null,
	initialPersistedOptionIds = [],
}: AssessmentSessionContentProps) {
	const navigate = useNavigate();
	const { userProfile } = useUsersStore();
	const showSaveAndExit =
		userProfile &&
		!isEndUserAssessmentIncomplete(userProfile.assessmentCompletionCount);
	const [activeSection, setActiveSection] = useState(
		() => sessionInitial?.activeSection ?? 0,
	);
	const [persistedOptionIds, setPersistedOptionIds] = useState(
		() => new Set<string>(initialPersistedOptionIds.map(String)),
	);
	const [scores, setScores] = useState<ScoreState>(
		() => sessionInitial?.scores ?? {},
	);
	const persistedOptionIdsRef = useRef<Set<string>>(
		new Set(initialPersistedOptionIds.map(String)),
	);
	const lastSyncedSignatureRef = useRef<Record<string, string>>({});
	const inFlightQuestionIdsRef = useRef<Set<string>>(new Set());
	const didSeedLastSyncedFromServerRef = useRef(false);
	const [saving, setSaving] = useState(false);
	const didScrollResumeRef = useRef(false);
	const prevActiveSectionRef = useRef<number | null>(null);
	const debouncedScores = useDebounce(scores);

	const { bulkPersistSectionResponses } = useAssessmentStore();

	useLayoutEffect(() => {
		if (!sessionInitial || didScrollResumeRef.current) {
			return;
		}
		didScrollResumeRef.current = true;
		const idx = String(sessionInitial.scrollToQuestionIndex);
		const el = document.querySelector(
			`[data-assessment-resume-question="${idx}"]`,
		);
		el?.scrollIntoView({ block: "start" });
	}, [sessionInitial]);

	useLayoutEffect(() => {
		persistedOptionIdsRef.current = new Set(persistedOptionIds);
	}, [persistedOptionIds]);

	useLayoutEffect(() => {
		if (allQuestions.length === 0 || didSeedLastSyncedFromServerRef.current) {
			return;
		}
		didSeedLastSyncedFromServerRef.current = true;
		const idSet = new Set(initialPersistedOptionIds.map(String));
		for (const q of allQuestions) {
			const sel = scores[q.id] ?? emptyScoresForQuestion();
			if (!isValidLikertSelection(sel)) {
				continue;
			}
			const opts = sortOptions(q.options);
			if (opts.length !== 4) {
				continue;
			}
			const allOnServer = opts.every((o) => idSet.has(String(o.id)));
			if (allOnServer) {
				lastSyncedSignatureRef.current[q.id] = likertSelectionSignature(sel);
			}
		}
	}, [allQuestions, initialPersistedOptionIds, scores]);

	useLayoutEffect(() => {
		const prev = prevActiveSectionRef.current;
		prevActiveSectionRef.current = activeSection;
		if (prev === null || prev === activeSection) {
			return;
		}
		const el = document.querySelector('[data-assessment-resume-question="0"]');
		el?.scrollIntoView({ block: "start" });
	}, [activeSection]);

	const sections = useMemo(
		() => splitQuestionSections(allQuestions),
		[allQuestions],
	);
	const meta = ASSESSMENT_SESSION.sections;

	const getSelections = useCallback(
		(q: ApiQuestionWithOptions) => scores[q.id] ?? emptyScoresForQuestion(),
		[scores],
	);

	const setRowScore = useCallback((qId: string, row: number, value: number) => {
		setScores((prev) => {
			const base = (prev[qId] ?? emptyScoresForQuestion()) as (number | null)[];
			const next = base.slice() as (number | null)[];
			next[row] = value;
			return { ...prev, [qId]: next };
		});
	}, []);

	const completedInSectionCount = useCallback(
		(section: ApiQuestionWithOptions[]) =>
			section.filter((q) => isValidLikertSelection(getSelections(q))).length,
		[getSelections],
	);

	const totalCompleted = useMemo(() => {
		if (!sections) return 0;
		return sections.reduce(
			(acc, sec) =>
				acc +
				sec.filter((q) => isValidLikertSelection(getSelections(q))).length,
			0,
		);
	}, [getSelections, sections]);

	const sectionComplete = useMemo(() => {
		if (!sections) return false;
		return (
			completedInSectionCount(sections[activeSection]) ===
			ASSESSMENT_QUESTIONS_PER_SECTION
		);
	}, [activeSection, completedInSectionCount, sections]);

	const sectionCompletedCount = useMemo(() => {
		if (!sections) return 0;
		return completedInSectionCount(sections[activeSection]);
	}, [activeSection, completedInSectionCount, sections]);

	const buildItemsForOneQuestion = useCallback(
		(
			q: ApiQuestionWithOptions,
			scoreState: ScoreState,
		): ApiQuestionResponseItem[] => {
			const sel = (scoreState[q.id] ?? emptyScoresForQuestion()) as (
				| number
				| null
			)[];
			if (!isValidLikertSelection(sel)) {
				return [];
			}
			const opts = sortOptions(q.options);
			return opts.map((opt, i) => ({
				option_id: opt.id,
				value: sel[i]!,
			}));
		},
		[],
	);

	useEffect(() => {
		if (!persistenceEnabled) {
			return;
		}
		let cancelled = false;
		const run = async () => {
			for (const q of allQuestions) {
				if (cancelled) {
					return;
				}
				const sel = (debouncedScores[q.id] ?? emptyScoresForQuestion()) as (
					| number
					| null
				)[];
				if (!isValidLikertSelection(sel)) {
					continue;
				}
				const sig = likertSelectionSignature(sel);
				if (lastSyncedSignatureRef.current[q.id] === sig) {
					continue;
				}
				if (inFlightQuestionIdsRef.current.has(q.id)) {
					continue;
				}
				const items = buildItemsForOneQuestion(q, debouncedScores);
				if (items.length !== 4) {
					continue;
				}
				inFlightQuestionIdsRef.current.add(q.id);
				try {
					const res = await bulkPersistSectionResponses(
						assessmentId,
						items,
						persistedOptionIdsRef.current,
					);
					if (cancelled) {
						return;
					}
					if (isApiError(res)) {
						continue;
					}
					lastSyncedSignatureRef.current[q.id] = sig;
					const n = new Set(persistedOptionIdsRef.current);
					for (const it of items) {
						n.add(String(it.option_id));
					}
					persistedOptionIdsRef.current = n;
					setPersistedOptionIds(n);
				} finally {
					inFlightQuestionIdsRef.current.delete(q.id);
				}
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		allQuestions,
		assessmentId,
		bulkPersistSectionResponses,
		buildItemsForOneQuestion,
		debouncedScores,
		persistenceEnabled,
	]);

	const persistCurrentSection = useCallback(async () => {
		if (!sections) {
			return { ok: false as const, message: "Invalid data" };
		}
		const current = sections[activeSection];
		if (completedInSectionCount(current) !== ASSESSMENT_QUESTIONS_PER_SECTION) {
			return { ok: false as const, message: "incomplete" };
		}
		if (!persistenceEnabled) {
			return { ok: true as const };
		}
		const toSync: ApiQuestionResponseItem[] = [];
		for (const q of current) {
			const sel = getSelections(q) as (number | null)[];
			if (!isValidLikertSelection(sel)) {
				return { ok: false as const, message: "incomplete" };
			}
			const sig = likertSelectionSignature(sel);
			if (lastSyncedSignatureRef.current[q.id] === sig) {
				continue;
			}
			toSync.push(...buildItemsForOneQuestion(q, scores));
		}
		if (toSync.length === 0) {
			return { ok: true as const };
		}
		const res = await bulkPersistSectionResponses(
			assessmentId,
			toSync,
			persistedOptionIdsRef.current,
		);
		if (isApiError(res)) {
			return { ok: false as const, message: res.message };
		}
		const n = new Set(persistedOptionIdsRef.current);
		for (const it of toSync) {
			n.add(String(it.option_id));
		}
		persistedOptionIdsRef.current = n;
		setPersistedOptionIds(n);
		for (const q of current) {
			const row = getSelections(q) as (number | null)[];
			if (isValidLikertSelection(row)) {
				lastSyncedSignatureRef.current[q.id] = likertSelectionSignature(row);
			}
		}
		return { ok: true as const };
	}, [
		activeSection,
		assessmentId,
		bulkPersistSectionResponses,
		buildItemsForOneQuestion,
		completedInSectionCount,
		getSelections,
		persistenceEnabled,
		sections,
	]);

	const handleBack = useCallback(() => {
		if (activeSection === 0) {
			onBackToInstructions();
			return;
		}
		setActiveSection((s) => s - 1);
	}, [activeSection, onBackToInstructions]);

	const handleSaveAndExit = useCallback(() => {
		if (saving) {
			return;
		}
		navigate(ROUTES.dashboard.root);
	}, [navigate, saving]);

	const handleContinue = useCallback(async () => {
		if (saving) return;
		if (!sectionComplete) {
			toast.error(ASSESSMENT_SESSION.completeSectionsFirst);
			return;
		}
		setSaving(true);
		const result = await persistCurrentSection();
		if (!result.ok) {
			if (result.message !== "incomplete") {
				toast.error(result.message);
			} else {
				toast.error(ASSESSMENT_SESSION.completeSectionsFirst);
			}
			setSaving(false);
			return;
		}
		if (activeSection === ASSESSMENT_SECTION_COUNT - 1) {
			setSaving(false);
			onAssessmentComplete(assessmentId);
			return;
		}
		setActiveSection((s) => s + 1);
		setSaving(false);
	}, [
		activeSection,
		assessmentId,
		onAssessmentComplete,
		persistCurrentSection,
		saving,
		sectionComplete,
	]);

	if (!sections) {
		return (
			<div className="text-small text-destructive">
				{ASSESSMENT_SESSION.startOver}
			</div>
		);
	}

	const isLast = activeSection === ASSESSMENT_SECTION_COUNT - 1;
	const curMeta = meta[activeSection]!;
	const prevLabel =
		activeSection === 0
			? ASSESSMENT_SESSION.backToInstructions
			: `Back to ${meta[activeSection - 1]!.title}`;
	const continueCta = isLast
		? "Finish Assessment"
		: `Continue to ${meta[activeSection + 1]!.title}`;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
			<div className="flex flex-col gap-4">
				<div
					className="flex w-full min-w-0 items-center overflow-x-auto pt-0.5 pb-1 sm:overflow-visible"
					role="list"
					aria-label="Assessment sections"
				>
					{meta.map((m, i) => {
						const isDone = i < activeSection;
						const isCurrent = i === activeSection;
						const isUpcoming = i > activeSection;
						return (
							<div key={m.abbr} className="contents">
								{i > 0 ? (
									<div
										className="mb-0 mt-0 hidden h-0 min-w-0 flex-1 self-center border-0 border-t border-border first:ms-0 sm:mx-1.5 sm:block"
										aria-hidden
									/>
								) : null}
								<div
									className={cn(
										"flex min-w-0 shrink-0 items-center gap-2 rounded-full border border-solid py-1 pl-1.5 pr-4",
										isCurrent &&
											"border-info bg-info text-light-same ring-2 ring-info/40",
										isDone && "border-success bg-success-bg",
										isUpcoming && "border-border bg-background",
									)}
									data-section-index={i}
									data-state={
										isCurrent ? "active" : isDone ? "completed" : "upcoming"
									}
									role="listitem"
									aria-current={isCurrent ? "step" : undefined}
								>
									<div
										className={cn(
											"flex size-8 shrink-0 items-center justify-center rounded-full p-2 text-small font-semibold leading-small tracking-normal",
											isCurrent && "bg-info-text text-inherit",
											isDone && "bg-icon-success text-primary-foreground",
											isUpcoming && "bg-card-foreground text-text-secondary",
										)}
									>
										{isDone ? (
											<Check
												className="size-3.5"
												strokeWidth={2.5}
												aria-hidden
											/>
										) : (
											i + 1
										)}
									</div>
									<span
										className={cn(
											"whitespace-nowrap text-center text-small font-semibold leading-small tracking-normal",
											isCurrent && "text-inherit",
											isDone && "text-interactive-success-active",
											isUpcoming && "text-muted-foreground",
										)}
									>
										{m.title}
									</span>
								</div>
							</div>
						);
					})}
				</div>
				<div className="flex w-full items-center justify-between gap-4">
					<div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full min-h-0 min-w-0 rounded-full bg-linear-to-r from-icon-success to-info"
							style={{
								width: `${Math.min(
									100,
									(totalCompleted /
										(ASSESSMENT_SECTION_COUNT *
											ASSESSMENT_QUESTIONS_PER_SECTION)) *
										100,
								)}%`,
							}}
						/>
					</div>
					<p className="shrink-0 text-right text-small font-semibold leading-small tracking-normal text-text-secondary">
						{ASSESSMENT_SESSION.progressLabel(totalCompleted)}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6">
				<div className="flex items-stretch gap-5">
					<div className="flex w-16 min-w-16 max-w-16 shrink-0 self-stretch">
						<div className="flex h-full min-h-9 w-full items-center justify-center rounded-xl bg-info px-4 py-1.5 text-center text-heading-4 font-semibold leading-heading-4 text-light-same">
							{curMeta.abbr}
						</div>
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5 text-start">
						<h1 className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
							{curMeta.title}
						</h1>
						<p className="text-regular font-normal leading-regular text-text-secondary">
							{curMeta.subtitle}
						</p>
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-5">
					<div
						className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-card-foreground"
						role="progressbar"
						aria-valuenow={sectionCompletedCount}
						aria-valuemin={0}
						aria-valuemax={ASSESSMENT_QUESTIONS_PER_SECTION}
						aria-label={ASSESSMENT_SESSION.sectionProgressLabel(
							sectionCompletedCount,
						)}
					>
						<div
							className="h-full min-h-0 min-w-0 rounded-full bg-info transition-[width] duration-200"
							style={{
								width: `${Math.min(
									100,
									(sectionCompletedCount / ASSESSMENT_QUESTIONS_PER_SECTION) *
										100,
								)}%`,
							}}
						/>
					</div>
					<p className="shrink-0 text-right text-small font-semibold leading-small tracking-normal text-text-secondary">
						{ASSESSMENT_SESSION.sectionProgressLabel(sectionCompletedCount)}
					</p>
				</div>
				<div
					className="flex items-start gap-3 rounded-xl bg-info-bg p-4"
					role="region"
					aria-label="Reminder"
				>
					<BellRing
						className="mt-0.5 size-4 shrink-0 text-info-text"
						aria-hidden
					/>
					<div className="flex min-w-0 flex-1 flex-col gap-px text-text-foreground">
						<p className="text-small font-bold leading-small text-info-text">
							{ASSESSMENT_SESSION.reminderTitle}
						</p>
						<p className="text-small font-normal leading-small text-text-foreground">
							{ASSESSMENT_SESSION.reminderLine.a}{" "}
							<span className="font-semibold">
								{ASSESSMENT_SESSION.reminderLine.emph10}
							</span>
							{ASSESSMENT_SESSION.reminderLine.b}
							<span className="font-semibold">
								{ASSESSMENT_SESSION.reminderLine.phraseMost}
							</span>
							{ASSESSMENT_SESSION.reminderLine.c}
							<span className="font-semibold">
								{ASSESSMENT_SESSION.reminderLine.emph1}
							</span>
							{ASSESSMENT_SESSION.reminderLine.d}
							<span className="font-semibold">
								{ASSESSMENT_SESSION.reminderLine.phraseLeast}
							</span>
							{ASSESSMENT_SESSION.reminderLine.e}
						</p>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{sections[activeSection]!.map((q, qi) => {
					const list = getSelections(q);
					const order =
						activeSection * ASSESSMENT_QUESTIONS_PER_SECTION + qi + 1;
					const opts = sortOptions(q.options);
					const statementTexts = opts.map((o) => o.option_text) as [
						string,
						string,
						string,
						string,
					];
					return (
						<article
							data-assessment-resume-question={qi}
							className="min-w-0"
							key={q.id}
						>
							<AssessmentLikertQuestionBlock
								instanceId={q.id}
								questionNumber={order}
								questionText={q.question_text}
								statements={statementTexts}
								selections={list}
								padScaleEnd
								onScoreSelect={(row, value) => setRowScore(q.id, row, value)}
							/>
						</article>
					);
				})}
			</div>

			<footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Button
					variant="outline"
					size="lg"
					className="w-full max-w-80 sm:w-auto"
					icon={ArrowLeft}
					onClick={handleBack}
					disabled={saving}
					type="button"
				>
					{prevLabel}
				</Button>
				<div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-2">
					{showSaveAndExit ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="lg"
									icon={Save}
									type="button"
									disabled={saving}
									onClick={handleSaveAndExit}
								>
									{ASSESSMENT_SESSION.saveAndExit}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs">
								{ASSESSMENT_SESSION.saveAndExitTooltip}
							</TooltipContent>
						</Tooltip>
					) : null}
					<Button
						size="lg"
						className="min-w-56"
						type="button"
						icon={ArrowRight}
						iconPosition="end"
						isLoading={saving}
						onClick={handleContinue}
					>
						{saving ? ASSESSMENT_SESSION.submitting : continueCta}
					</Button>
				</div>
			</footer>
		</div>
	);
}
