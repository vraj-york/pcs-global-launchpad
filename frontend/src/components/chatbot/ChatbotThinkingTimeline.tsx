import {
	ChevronDown,
	CircleCheckBig,
	type LucideIcon,
	Sparkles,
} from "lucide-react";
import { Fragment } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	CHATBOT_THINKING_CONTENT,
	CHATBOT_THINKING_STEP_ICONS,
	CHATBOT_THINKING_TOOL_ICONS,
	CHATBOT_THINKING_TOOL_LABELS,
} from "@/const";
import type {
	ChatbotThinkingStep,
	ChatbotThinkingTimelineProps,
	ChatbotThinkingTimelineRow,
	ThinkingStepKey,
} from "@/types";

function resolveRow(step: ChatbotThinkingStep): ChatbotThinkingTimelineRow {
	const fixedIcon = CHATBOT_THINKING_STEP_ICONS[step.key as ThinkingStepKey];
	if (fixedIcon) {
		return {
			id: step.key,
			icon: fixedIcon,
			label: CHATBOT_THINKING_CONTENT.steps[step.key as ThinkingStepKey],
		};
	}
	return {
		id: step.key,
		icon: CHATBOT_THINKING_TOOL_ICONS[step.key] ?? Sparkles,
		label: CHATBOT_THINKING_TOOL_LABELS[step.key] ?? step.label ?? step.key,
	};
}

function ProcessingDots() {
	return (
		<span className="flex items-center gap-0.5" aria-hidden="true">
			<span className="size-1 animate-pulse rounded-full bg-muted-foreground" />
			<span className="size-1 animate-pulse rounded-full bg-muted-foreground" />
			<span className="size-1 animate-pulse rounded-full bg-muted-foreground" />
		</span>
	);
}

function StepConnector() {
	return (
		<div className="flex w-full items-center px-1.5">
			<div className="h-4 w-px bg-border" />
		</div>
	);
}

function ThinkingStepRow({
	icon: Icon,
	label,
}: {
	icon: LucideIcon;
	label: string;
}) {
	return (
		<div className="flex w-full items-center gap-2">
			<Icon className="size-3 shrink-0 text-muted-foreground" />
			<span className="text-mini font-medium text-muted-foreground">
				{label}
			</span>
		</div>
	);
}

export function ChatbotThinkingTimeline({
	steps,
	isProcessing,
	defaultExpanded = false,
}: ChatbotThinkingTimelineProps) {
	if (steps.length === 0) return null;

	const headerLabel = isProcessing
		? CHATBOT_THINKING_CONTENT.headerActive
		: CHATBOT_THINKING_CONTENT.headerDone;

	const rows: ChatbotThinkingTimelineRow[] = steps.map(resolveRow);
	if (!isProcessing) {
		rows.push({
			id: "done",
			icon: CircleCheckBig,
			label: CHATBOT_THINKING_CONTENT.doneLabel,
		});
	}

	return (
		<Collapsible
			defaultOpen={defaultExpanded}
			className="flex w-full flex-col"
			aria-label={CHATBOT_THINKING_CONTENT.regionLabel}
		>
			<CollapsibleTrigger
				className="group/thinking flex min-h-6 items-center gap-1.5 rounded-lg py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
				aria-label={CHATBOT_THINKING_CONTENT.toggleLabel}
			>
				{isProcessing ? <ProcessingDots /> : null}
				<span className="text-mini font-medium text-muted-foreground">
					{headerLabel}
				</span>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]/thinking:-rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="flex flex-col items-start pt-1">
					{rows.map((row, index) => (
						<Fragment key={row.id}>
							{index > 0 ? <StepConnector /> : null}
							<ThinkingStepRow icon={row.icon} label={row.label} />
						</Fragment>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
