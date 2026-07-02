import { ArrowUp, Mic, Paperclip, Sparkles, Zap } from "lucide-react";
import { ChatbotMentionTextarea } from "@/components";
import { Button } from "@/components/ui/button";
import { CHATBOT_PAGE_CONTENT, FORM_PLACEHOLDERS } from "@/const";
import { cn } from "@/lib/utils";
import type { ChatbotComposerProps } from "@/types";

export function ChatbotComposer({
	question,
	searchMode,
	isLoading,
	mentionsEnabled = false,
	composerMentions,
	disclaimerAlign = "center",
	onQuestionChange,
	onComposerMentionsChange,
	onSearchModeChange,
	onSubmit,
	onKeyDown,
	onComposerFocus,
}: ChatbotComposerProps) {
	const modeButtonClass = (isActive: boolean) =>
		cn(
			"inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-small font-semibold transition-colors",
			isActive
				? "bg-background text-primary shadow-xs"
				: "text-text-secondary hover:text-text-foreground",
		);

	return (
		<div className="w-full max-w-3xl space-y-4 pb-2">
			<form
				onSubmit={onSubmit}
				className="min-h-14 rounded-xl border border-border-muted bg-background px-2 py-2 shadow-md"
			>
				<div className="flex items-center gap-4">
					<div className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-muted p-1">
						<button
							type="button"
							onClick={() => onSearchModeChange("quick")}
							className={`${modeButtonClass(searchMode === "quick")} cursor-pointer`}
							aria-pressed={searchMode === "quick"}
						>
							<Zap className="size-4" />
							<span>{CHATBOT_PAGE_CONTENT.quickMode}</span>
						</button>
						<button
							type="button"
							onClick={() => onSearchModeChange("deep_dive")}
							className={`${modeButtonClass(searchMode === "deep_dive")} cursor-pointer`}
							aria-pressed={searchMode === "deep_dive"}
						>
							<Sparkles className="size-4" />
							<span>{CHATBOT_PAGE_CONTENT.deepDiveMode}</span>
						</button>
					</div>

					<ChatbotMentionTextarea
						value={question}
						onChange={onQuestionChange}
						onKeyDown={onKeyDown}
						onFocus={onComposerFocus}
						disabled={isLoading}
						mentionsEnabled={mentionsEnabled}
						selectedMentions={composerMentions}
						onMentionsChange={onComposerMentionsChange}
						ariaLabel={FORM_PLACEHOLDERS.askAnything}
						placeholder={FORM_PLACEHOLDERS.askAnything}
					/>

					<div className="flex shrink-0 items-center gap-1 text-brand-secondary">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							disabled
							icon={Paperclip}
							className="size-8 text-brand-secondary hover:bg-muted"
							aria-label={CHATBOT_PAGE_CONTENT.attachmentButtonLabel}
							title={CHATBOT_PAGE_CONTENT.attachmentButtonLabel}
						/>

						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							disabled
							icon={Mic}
							className="size-8 text-brand-secondary hover:bg-muted"
							aria-label={CHATBOT_PAGE_CONTENT.voiceInputButtonLabel}
							title={CHATBOT_PAGE_CONTENT.voiceInputButtonLabel}
						/>

						<Button
							type="submit"
							size="icon"
							disabled={!question.trim()}
							isLoading={isLoading}
							icon={ArrowUp}
							className="size-9 bg-primary text-primary-foreground hover:bg-primary/90"
							aria-label={CHATBOT_PAGE_CONTENT.sendButton}
						/>
					</div>
				</div>
			</form>

			<p
				className={cn(
					"text-mini font-medium text-brand-secondary",
					disclaimerAlign === "left" ? "text-left" : "text-center",
				)}
			>
				{CHATBOT_PAGE_CONTENT.disclaimer}
			</p>
		</div>
	);
}
