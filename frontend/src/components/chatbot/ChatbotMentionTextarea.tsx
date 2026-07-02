import {
	type KeyboardEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CHATBOT_PEER_MENTIONS } from "@/const";
import { usePeerMentionAutocomplete } from "@/hooks";
import {
	canAddMention,
	cn,
	initialsFromDisplayName,
	mentionToken,
	useMentionPosition,
} from "@/lib";
import type {
	ChatbotMentionTextareaProps,
	ChatbotPeerMention,
	PeerMentionListItem,
} from "@/types";

function findMentionTriggerIndex(
	value: string,
	trigger: string,
	query: string,
) {
	const needle = `${trigger}${query}`;
	return value.lastIndexOf(needle);
}

function isInsideCompletedMentionToken(
	query: string,
	selectedMentions: ChatbotPeerMention[],
) {
	const loweredQuery = query.toLowerCase();
	return selectedMentions.some((mention) =>
		loweredQuery.startsWith(`${mention.label.toLowerCase()} `),
	);
}

type HighlightedSegment = {
	text: string;
	isMention: boolean;
};

function buildHighlightedSegments(
	text: string,
	selectedMentions: ChatbotPeerMention[],
): HighlightedSegment[] {
	if (!text) return [{ text: "", isMention: false }];

	const mentionTokens = selectedMentions
		.map((mention) => mentionToken(mention.label))
		.sort((a, b) => b.length - a.length);

	if (mentionTokens.length === 0) {
		return [{ text, isMention: false }];
	}

	const segments: HighlightedSegment[] = [];
	let cursor = 0;

	while (cursor < text.length) {
		let matchIndex = -1;
		let matchToken = "";

		for (const token of mentionTokens) {
			const idx = text.indexOf(token, cursor);
			if (idx === -1) continue;
			const nextChar = text[idx + token.length];
			if (nextChar && !/\s/.test(nextChar)) continue;
			if (matchIndex === -1 || idx < matchIndex) {
				matchIndex = idx;
				matchToken = token;
			}
		}

		if (matchIndex === -1) {
			segments.push({ text: text.slice(cursor), isMention: false });
			break;
		}

		if (matchIndex > cursor) {
			segments.push({
				text: text.slice(cursor, matchIndex),
				isMention: false,
			});
		}

		segments.push({ text: matchToken, isMention: true });
		cursor = matchIndex + matchToken.length;
	}

	return segments;
}

export function ChatbotMentionTextarea({
	value,
	onChange,
	onKeyDown,
	onFocus,
	disabled = false,
	mentionsEnabled = false,
	selectedMentions,
	onMentionsChange,
	className,
	rows = 1,
	ariaLabel,
	placeholder,
}: ChatbotMentionTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const highlightRef = useRef<HTMLDivElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const pendingCursorRef = useRef<number | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isNavigating, setIsNavigating] = useState(false);

	const contentClassName = cn(
		"py-2 text-regular leading-regular whitespace-pre-wrap break-words",
		className,
	);

	const { popupPos, query, currentTrigger, update, clear } = useMentionPosition(
		textareaRef as RefObject<HTMLTextAreaElement | null>,
	);

	const popupOpen =
		mentionsEnabled &&
		Boolean(popupPos) &&
		!isInsideCompletedMentionToken(query, selectedMentions);
	const { peers, isLoading, error } = usePeerMentionAutocomplete(
		query,
		popupOpen,
	);

	const filteredPeers = useMemo(() => {
		if (!popupOpen) return [];
		return peers;
	}, [peers, popupOpen]);

	const highlightedSegments = useMemo(
		() => buildHighlightedSegments(value, selectedMentions),
		[value, selectedMentions],
	);

	useEffect(() => {
		if (popupOpen) {
			setSelectedIndex(0);
		}
	}, [popupOpen, query]);

	useEffect(() => {
		if (filteredPeers.length > 0 && selectedIndex >= filteredPeers.length) {
			setSelectedIndex(0);
		}
	}, [filteredPeers.length, selectedIndex]);

	useEffect(() => {
		if (!popupPos || !popupRef.current) return;
		const selectedElement = popupRef.current.querySelector(
			`[data-index="${selectedIndex}"]`,
		);
		selectedElement?.scrollIntoView({ block: "nearest", behavior: "instant" });
	}, [selectedIndex, popupPos]);

	const syncHighlightScroll = () => {
		const ta = textareaRef.current;
		const overlay = highlightRef.current;
		if (!ta || !overlay) return;
		overlay.scrollTop = ta.scrollTop;
		overlay.scrollLeft = ta.scrollLeft;
	};

	useLayoutEffect(() => {
		if (pendingCursorRef.current === null) return;
		const ta = textareaRef.current;
		if (!ta) return;

		const cursor = pendingCursorRef.current;
		pendingCursorRef.current = null;
		ta.setSelectionRange(cursor, cursor);
		ta.focus();
		syncHighlightScroll();
	}, [value]);

	const handleMentionSelect = (peer: PeerMentionListItem) => {
		if (!currentTrigger || !canAddMention(selectedMentions)) return;

		const atIndex = findMentionTriggerIndex(value, currentTrigger, query);
		if (atIndex === -1) return;

		const token = mentionToken(peer.displayName);
		const beforeTrigger = value.substring(0, atIndex);
		const afterQuery = value.substring(
			atIndex + currentTrigger.length + query.length,
		);
		const newText = `${beforeTrigger}${token} ${afterQuery}`;
		pendingCursorRef.current = newText.length - afterQuery.length;
		onChange(newText);

		const nextMention: ChatbotPeerMention = {
			type: "person",
			id: peer.id,
			label: peer.displayName,
		};
		onMentionsChange([...selectedMentions, nextMention]);

		clear();
		setSelectedIndex(0);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (popupOpen && filteredPeers.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setIsNavigating(true);
				setSelectedIndex((prev) =>
					prev < filteredPeers.length - 1 ? prev + 1 : 0,
				);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				setIsNavigating(true);
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : filteredPeers.length - 1,
				);
				return;
			}

			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				setIsNavigating(false);
				const peer = filteredPeers[selectedIndex];
				if (peer) handleMentionSelect(peer);
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				setIsNavigating(false);
				clear();
				return;
			}
		}

		setIsNavigating(false);
		onKeyDown?.(event);
	};

	const handleTextChange = (next: string) => {
		onChange(next);
		window.requestAnimationFrame(() => update());
	};

	const handleTextareaScroll = () => {
		update();
		syncHighlightScroll();
	};

	const listStatus = (() => {
		if (!canAddMention(selectedMentions)) {
			return CHATBOT_PEER_MENTIONS.limitReached;
		}
		if (isLoading) return CHATBOT_PEER_MENTIONS.loadingList;
		if (error) return CHATBOT_PEER_MENTIONS.listFailed;
		if (filteredPeers.length === 0) return CHATBOT_PEER_MENTIONS.emptyList;
		return null;
	})();

	return (
		<div className="relative min-w-0 flex-1">
			<div
				ref={highlightRef}
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-0 overflow-hidden text-text-foreground",
					contentClassName,
				)}
			>
				{highlightedSegments.map((segment, index) => (
					<span
						key={`${segment.text}-${index}`}
						className={segment.isMention ? "text-link" : "text-text-foreground"}
					>
						{segment.text}
					</span>
				))}
			</div>
			<textarea
				ref={textareaRef}
				value={value}
				onChange={(event) => handleTextChange(event.target.value)}
				onKeyUp={() => {
					if (!isNavigating) update();
				}}
				onClick={update}
				onScroll={handleTextareaScroll}
				onKeyDown={handleKeyDown}
				onFocus={onFocus}
				placeholder={placeholder}
				className={cn(
					"relative z-10 min-h-10 w-full resize-none bg-transparent text-transparent caret-text-foreground outline-none placeholder:text-brand-secondary disabled:cursor-not-allowed",
					contentClassName,
				)}
				disabled={disabled}
				rows={rows}
				aria-label={ariaLabel}
			/>

			{popupOpen && popupPos ? (
				<div
					ref={popupRef}
					role="listbox"
					aria-label={CHATBOT_PEER_MENTIONS.listAriaLabel}
					style={{
						position: "fixed",
						top: popupPos.top,
						left: popupPos.left,
					}}
					className="z-100 w-80 rounded-xl border border-border bg-background p-3 shadow-sm"
					onMouseDown={(event) => event.preventDefault()}
				>
					<div className="max-h-72 overflow-y-auto">
						{listStatus ? (
							<p className="py-4 text-center text-small text-text-secondary">
								{listStatus}
							</p>
						) : (
							filteredPeers.slice(0, 20).map((peer, index) => {
								const isSelected = index === selectedIndex;
								const subtitle = peer.email ?? peer.jobRole;
								return (
									<div
										key={peer.id}
										role="option"
										aria-selected={isSelected}
										data-index={index}
										tabIndex={0}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											handleMentionSelect(peer);
										}}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												handleMentionSelect(peer);
											}
										}}
										onMouseDown={(event) => event.preventDefault()}
										className={cn(
											"flex cursor-pointer items-center gap-3 border-b border-border pb-3 select-none last:border-b-0 last:pb-0",
											isSelected
												? "rounded-lg bg-muted/70 text-text-foreground !p-1"
												: "text-text-foreground hover:rounded-lg hover:bg-muted/40",
										)}
									>
										<Avatar className="size-8 shrink-0">
											<AvatarFallback className="text-mini font-semibold">
												{initialsFromDisplayName(peer.displayName)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="truncate text-small font-medium text-text-foreground capitalize">
												{peer.displayName}
											</p>
											{subtitle ? (
												<p className="truncate text-mini text-muted-foreground">
													{subtitle}
												</p>
											) : null}
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
