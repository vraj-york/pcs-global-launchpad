import { FileText, type LucideIcon, NotebookPen, Sparkles } from "lucide-react";
import { BSPBadge } from "@/components";
import {
	CHATBOT_BADGE_TYPE_FOLLOW_UP_CHIP,
	CHATBOT_PAGE_CONTENT,
} from "@/const";
import { logFollowUpChipClick } from "@/lib";
import { cn } from "@/lib/utils";
import type { ChatbotFollowUpChipsProps } from "@/types";

const CHIP_ICON_BY_SLOT: [LucideIcon, LucideIcon, LucideIcon] = [
	FileText,
	NotebookPen,
	Sparkles,
];

function FollowUpChipIcon({ slot }: { slot: 0 | 1 | 2 }) {
	const Icon = CHIP_ICON_BY_SLOT[slot];
	return <Icon aria-hidden />;
}

export function ChatbotFollowUpChips({
	followUps,
	onSelectQuery,
	variant = "default",
}: ChatbotFollowUpChipsProps) {
	const isCompact = variant === "compact";
	const stackClass = isCompact
		? "flex flex-col items-start gap-3"
		: "flex flex-row flex-wrap items-center gap-3";

	const summarizeQuery = CHATBOT_PAGE_CONTENT.summarizeConversationUserQuery;

	const handleSummarizeClick = () => {
		logFollowUpChipClick({
			event: "follow_up_chip_click",
			isSummarize: true,
			queryCharLength: summarizeQuery.length,
		});
		onSelectQuery(summarizeQuery);
	};

	const handleDynamicClick = (submit: string) => {
		logFollowUpChipClick({
			event: "follow_up_chip_click",
			isSummarize: false,
			queryCharLength: submit.length,
		});
		onSelectQuery(submit);
	};

	return (
		<div
			className={cn(stackClass)}
			role="group"
			aria-label={CHATBOT_PAGE_CONTENT.followUpSuggestionsRegionLabel}
		>
			{followUps.status === "loading" ? (
				[0, 1, 2].map((slot) => (
					<BSPBadge
						key={slot}
						type={CHATBOT_BADGE_TYPE_FOLLOW_UP_CHIP}
						aria-hidden
					>
						<span className="size-3.5 shrink-0 rounded-sm bg-muted-foreground/20" />
						<span className="h-3 min-w-16 rounded-sm bg-muted-foreground/20" />
					</BSPBadge>
				))
			) : (
				<>
					<BSPBadge type={CHATBOT_BADGE_TYPE_FOLLOW_UP_CHIP} asChild>
						<button
							type="button"
							tabIndex={0}
							aria-label={summarizeQuery}
							title={summarizeQuery}
							onClick={handleSummarizeClick}
						>
							<FollowUpChipIcon slot={0} />
							<span className="min-w-0 truncate">
								{CHATBOT_PAGE_CONTENT.summarizeConversationChipLabel}
							</span>
						</button>
					</BSPBadge>
					{followUps.chips.map((chip, index) => {
						const slot = (index + 1) as 1 | 2;
						return (
							<BSPBadge
								key={`${index}-${chip.display.slice(0, 20)}`}
								type={CHATBOT_BADGE_TYPE_FOLLOW_UP_CHIP}
								asChild
							>
								<button
									type="button"
									tabIndex={0}
									aria-label={chip.submit}
									title={chip.submit}
									onClick={() => handleDynamicClick(chip.submit)}
								>
									<FollowUpChipIcon slot={slot} />
									<span className="min-w-0 truncate">{chip.display}</span>
								</button>
							</BSPBadge>
						);
					})}
				</>
			)}
		</div>
	);
}
