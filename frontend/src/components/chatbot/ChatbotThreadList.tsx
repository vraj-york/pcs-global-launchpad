import {
	FileText,
	MoreVertical,
	Pencil,
	Pin,
	PinOff,
	SquarePen,
	Trash2,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ChatbotExportModal } from "@/components";
import { ConfirmationModal } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CHATBOT_THREAD_CONTENT, FORM_PLACEHOLDERS } from "@/const";
import { cn } from "@/lib/utils";
import type {
	ChatbotThread,
	ChatbotThreadItemProps,
	ChatbotThreadListProps,
	ChatbotThreadRenameInputProps,
} from "@/types";

function ThreadSkeleton({ compact = false }: { compact?: boolean }) {
	return (
		<div className={cn("space-y-1 py-1", compact ? "px-0" : "px-3")}>
			{[1, 2, 3].map((i) => (
				<Skeleton key={i} className="h-8 w-full rounded-lg" />
			))}
		</div>
	);
}

function ThreadItem({
	thread,
	isActive,
	isRefreshing,
	isTitleGenerating,
	shouldRevealTitle,
	titleRevealToken,
	uiVariant,
	onSelect,
	onRenameStart,
	onTogglePin,
	onDeleteStart,
	onExportStart,
}: ChatbotThreadItemProps) {
	const isCompactMenu = uiVariant === "compact";
	const [visibleTitle, setVisibleTitle] = useState(thread.title);
	const [sweepActive, setSweepActive] = useState(false);
	const [marqueeOffsetPx, setMarqueeOffsetPx] = useState(0);
	const [marqueeDurationMs, setMarqueeDurationMs] = useState(0);
	const textContainerRef = useRef<HTMLSpanElement>(null);
	const textContentRef = useRef<HTMLSpanElement>(null);

	const runShimmer = () => {
		setSweepActive(false);
		const rafId = window.requestAnimationFrame(() => setSweepActive(true));
		const clearId = window.setTimeout(() => setSweepActive(false), 1200);
		return () => {
			window.cancelAnimationFrame(rafId);
			window.clearTimeout(clearId);
		};
	};

	const runScrollToEndAndBack = () => {
		const container = textContainerRef.current;
		const content = textContentRef.current;
		if (!container || !content) return;
		const overflowPx = content.scrollWidth - container.clientWidth;
		if (overflowPx <= 8) {
			setMarqueeOffsetPx(0);
			setMarqueeDurationMs(0);
			return;
		}

		const toEndMs = Math.min(2200, Math.max(900, overflowPx * 18));
		setMarqueeDurationMs(toEndMs);
		setMarqueeOffsetPx(-overflowPx);

		window.setTimeout(() => {
			setMarqueeDurationMs(850);
			setMarqueeOffsetPx(0);
		}, toEndMs + 250);
	};

	useEffect(() => {
		if (isTitleGenerating) {
			setVisibleTitle(thread.title);
			setMarqueeOffsetPx(0);
			setMarqueeDurationMs(0);
			setSweepActive(false);
			return;
		}
		if (!shouldRevealTitle) {
			setVisibleTitle(thread.title);
			setSweepActive(false);
			setMarqueeOffsetPx(0);
			setMarqueeDurationMs(0);
			return;
		}

		let index = 0;
		setVisibleTitle("");
		setMarqueeOffsetPx(0);
		setMarqueeDurationMs(0);
		const timer = window.setInterval(() => {
			index += 1;
			setVisibleTitle(thread.title.slice(0, index));
			if (index >= thread.title.length) {
				window.clearInterval(timer);
				const clearShimmer = runShimmer();
				window.setTimeout(() => {
					clearShimmer();
					runScrollToEndAndBack();
				}, 100);
			}
		}, 18);
		return () => window.clearInterval(timer);
	}, [thread.title, shouldRevealTitle, titleRevealToken]);

	const titleClassName = cn(
		"flex-1 truncate text-small font-medium leading-tight",
		isRefreshing && !isTitleGenerating && "animate-pulse",
	);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onSelect();
			}}
			className={cn(
				"group/thread relative flex w-full cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-left transition-colors",
				"outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
				isActive
					? "bg-primary/12 text-text-foreground"
					: "text-text-secondary hover:bg-muted/60 hover:text-text-foreground",
			)}
			aria-current={isActive ? "true" : undefined}
		>
			<span className={titleClassName}>
				{isTitleGenerating ? (
					<span className="relative inline-flex max-w-full items-center overflow-hidden align-middle">
						<span className="truncate text-text-secondary">
							{CHATBOT_THREAD_CONTENT.generatingTitle}
						</span>
						<span className="ml-1 inline-flex items-center gap-0.5">
							<span className="size-1 animate-pulse rounded-full bg-brand-secondary/50" />
							<span className="size-1 animate-pulse rounded-full bg-brand-secondary/70 delay-150" />
							<span className="size-1 animate-pulse rounded-full bg-brand-secondary delay-300" />
						</span>
					</span>
				) : shouldRevealTitle ? (
					<span
						ref={textContainerRef}
						className="relative inline-block max-w-full select-none overflow-hidden align-middle"
					>
						<span
							ref={textContentRef}
							className="inline-block whitespace-nowrap transition-transform ease-in-out will-change-transform"
							style={{
								transform: `translateX(${marqueeOffsetPx}px)`,
								transitionDuration: `${marqueeDurationMs}ms`,
							}}
						>
							{visibleTitle}
						</span>
						<span
							className={cn(
								"pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-primary/8 to-transparent opacity-80 transition-transform duration-1000 ease-out",
								sweepActive ? "translate-x-full" : "-translate-x-full",
							)}
							aria-hidden
						/>
					</span>
				) : (
					visibleTitle
				)}
			</span>

			{thread.pinned && (
				<Pin
					className="size-3 shrink-0 text-brand-primary opacity-60"
					aria-hidden
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						icon={MoreVertical}
						className={cn(
							"size-6 shrink-0 rounded-md text-brand-secondary transition-opacity",
							"bg-transparent aria-expanded:bg-transparent data-[state=open]:bg-transparent",
							"hover:bg-muted hover:text-text-foreground",
							isActive
								? "opacity-100"
								: "opacity-0 group-hover/thread:opacity-100",
						)}
						aria-label={CHATBOT_THREAD_CONTENT.moreActionsLabel}
						onClick={(e) => e.stopPropagation()}
					/>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					align="end"
					sideOffset={4}
					className={cn(
						isCompactMenu &&
							"min-w-35 w-35 rounded-xl border border-border-muted p-0 py-1 shadow-xs",
					)}
				>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onTogglePin();
						}}
						className={cn(
							isCompactMenu &&
								"cursor-pointer rounded-none bg-transparent p-1.5 h-auto",
						)}
					>
						{isCompactMenu ? (
							<div className="flex h-8 min-h-8 w-full items-center gap-2 rounded-lg px-1.5">
								<span className="flex size-5 shrink-0 items-center justify-center text-text-foreground">
									{thread.pinned ? (
										<PinOff className="size-4" />
									) : (
										<Pin className="size-4" />
									)}
								</span>
								<span className="text-small font-medium text-text-foreground">
									{thread.pinned
										? CHATBOT_THREAD_CONTENT.unpinChat
										: CHATBOT_THREAD_CONTENT.pinChat}
								</span>
							</div>
						) : thread.pinned ? (
							<>
								<PinOff className="size-4" />
								{CHATBOT_THREAD_CONTENT.unpinChat}
							</>
						) : (
							<>
								<Pin className="size-4" />
								{CHATBOT_THREAD_CONTENT.pinChat}
							</>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onRenameStart();
						}}
						className={cn(
							isCompactMenu &&
								"cursor-pointer rounded-none bg-transparent p-1.5 h-auto",
						)}
					>
						{isCompactMenu ? (
							<div className="flex h-8 min-h-8 w-full items-center gap-2 rounded-lg px-1.5">
								<span className="flex size-5 shrink-0 items-center justify-center text-text-foreground">
									<SquarePen className="size-4" />
								</span>
								<span className="text-small font-medium text-text-foreground">
									{CHATBOT_THREAD_CONTENT.rename}
								</span>
							</div>
						) : (
							<>
								<Pencil className="size-4" />
								{CHATBOT_THREAD_CONTENT.rename}
							</>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onExportStart();
						}}
						className={cn(
							isCompactMenu &&
								"cursor-pointer rounded-none bg-transparent p-1.5 h-auto",
						)}
					>
						{isCompactMenu ? (
							<div className="flex h-8 min-h-8 w-full items-center gap-2 rounded-lg px-1.5">
								<span className="flex size-5 shrink-0 items-center justify-center text-text-foreground">
									<FileText className="size-4" />
								</span>
								<span className="text-small font-medium text-text-foreground">
									{CHATBOT_THREAD_CONTENT.saveAsPdf}
								</span>
							</div>
						) : (
							<>
								<FileText className="size-4" />
								{CHATBOT_THREAD_CONTENT.saveAsPdf}
							</>
						)}
					</DropdownMenuItem>
					{!isCompactMenu && <DropdownMenuSeparator />}
					<DropdownMenuItem
						variant="destructive"
						onClick={(e) => {
							e.stopPropagation();
							onDeleteStart();
						}}
						className={cn(
							isCompactMenu &&
								"cursor-pointer rounded-none border-t border-border-muted bg-transparent p-1.5 h-auto focus:bg-muted/30",
						)}
					>
						{isCompactMenu ? (
							<div className="flex h-8 min-h-8 w-full items-center gap-2 rounded-lg  px-1.5">
								<span className="flex size-5 shrink-0 items-center justify-center text-destructive">
									<Trash2 className="size-4" />
								</span>
								<span className="text-small font-medium text-destructive">
									{CHATBOT_THREAD_CONTENT.delete}
								</span>
							</div>
						) : (
							<>
								<Trash2 className="size-4" />
								{CHATBOT_THREAD_CONTENT.delete}
							</>
						)}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function RenameInput({
	thread,
	onConfirm,
	onCancel,
}: ChatbotThreadRenameInputProps) {
	const [value, setValue] = useState(thread.title);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const trimmed = value.trim();
			if (trimmed) onConfirm(trimmed);
		} else if (e.key === "Escape") {
			onCancel();
		}
	};

	return (
		<div className="px-2 py-1">
			<input
				ref={inputRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => {
					const trimmed = value.trim();
					if (trimmed && trimmed !== thread.title) {
						onConfirm(trimmed);
					} else {
						onCancel();
					}
				}}
				placeholder={FORM_PLACEHOLDERS.conversationName}
				className="w-full rounded-md border border-border-muted bg-background px-2 py-1 text-small text-text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
				aria-label={FORM_PLACEHOLDERS.conversationName}
			/>
		</div>
	);
}

export function ChatbotThreadList({
	threads,
	activeThreadId,
	isLoading,
	titleRevealThreadId,
	titleRevealToken,
	titleGeneratingThreadId,
	onThreadSelect,
	onRenameThread,
	onTogglePinThread,
	onDeleteThread,
	uiVariant = "default",
}: ChatbotThreadListProps) {
	const isCompactList = uiVariant === "compact";
	const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
	const [deletingThread, setDeletingThread] = useState<ChatbotThread | null>(
		null,
	);
	const [exportingThread, setExportingThread] = useState<ChatbotThread | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleRenameConfirm = async (id: string, title: string) => {
		setRenamingThreadId(null);
		await onRenameThread(id, title);
	};

	const handleTogglePin = async (thread: ChatbotThread) => {
		await onTogglePinThread(thread.id, !thread.pinned);
	};

	const handleDeleteConfirm = async () => {
		if (!deletingThread) return;
		setIsDeleting(true);
		await onDeleteThread(deletingThread.id);
		setIsDeleting(false);
		setDeletingThread(null);
	};

	if (isLoading && threads.length === 0)
		return <ThreadSkeleton compact={isCompactList} />;

	if (threads.length === 0) {
		return (
			<p
				className={cn(
					"py-3 text-small font-medium text-brand-secondary",
					isCompactList ? "px-0" : "px-4",
				)}
			>
				{CHATBOT_THREAD_CONTENT.emptyState}
			</p>
		);
	}

	return (
		<>
			{isLoading && threads.length > 0 && (
				<div className={cn("pb-1", isCompactList ? "px-0" : "px-3")}>
					<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-primary/50" />
					</div>
				</div>
			)}
			<div
				className={cn(
					"flex flex-col py-1",
					isCompactList ? "gap-2.5" : "gap-0.5 px-3",
				)}
			>
				{threads.map((thread) => {
					const isActive = thread.id === activeThreadId;

					if (renamingThreadId === thread.id) {
						return (
							<RenameInput
								key={thread.id}
								thread={thread}
								onConfirm={(title) =>
									void handleRenameConfirm(thread.id, title)
								}
								onCancel={() => setRenamingThreadId(null)}
							/>
						);
					}

					return (
						<ThreadItem
							key={thread.id}
							thread={thread}
							isActive={isActive}
							isRefreshing={isLoading}
							isTitleGenerating={thread.id === titleGeneratingThreadId}
							shouldRevealTitle={thread.id === titleRevealThreadId}
							titleRevealToken={titleRevealToken}
							uiVariant={uiVariant}
							onSelect={() => onThreadSelect(thread)}
							onRenameStart={() => setRenamingThreadId(thread.id)}
							onTogglePin={() => void handleTogglePin(thread)}
							onDeleteStart={() => setDeletingThread(thread)}
							onExportStart={() => setExportingThread(thread)}
						/>
					);
				})}
			</div>

			<ConfirmationModal
				open={deletingThread !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingThread(null);
				}}
				title={CHATBOT_THREAD_CONTENT.deleteTitle}
				description={CHATBOT_THREAD_CONTENT.deleteDescription}
				icon={<Trash2 className="size-8 text-destructive" />}
				confirmLabel={CHATBOT_THREAD_CONTENT.deleteConfirmLabel}
				cancelLabel={CHATBOT_THREAD_CONTENT.deleteCancelLabel}
				confirmIcon={Trash2}
				onConfirm={handleDeleteConfirm}
				isConfirming={isDeleting}
				variant="destructive"
			/>

			<ChatbotExportModal
				thread={exportingThread}
				onClose={() => setExportingThread(null)}
			/>
		</>
	);
}
