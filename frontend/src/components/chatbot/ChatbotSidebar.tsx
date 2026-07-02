import { Bot, ChevronDown, History, Pin, Plus, Search } from "lucide-react";
import {
	type ComponentType,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useMemo,
	useState,
} from "react";
import { ChatbotThreadList } from "@/components";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	CHATBOT_BOT_NAME,
	CHATBOT_PAGE_CONTENT,
	CHATBOT_SIDEBAR_DEFAULT_WIDTH_VW,
	CHATBOT_SIDEBAR_MAX_WIDTH_VW,
	CHATBOT_THREAD_CONTENT,
	FORM_PLACEHOLDERS,
} from "@/const";
import { cn } from "@/lib/utils";
import { useChatbotStore } from "@/store";
import type { ChatbotSidebarProps, ChatbotThread } from "@/types";

const SIDEBAR_WIDTH_ICON = "3.75rem";
const DEFAULT_SIDEBAR_WIDTH = `${CHATBOT_SIDEBAR_DEFAULT_WIDTH_VW}vw`;

type ThreadListHandlers = {
	activeThreadId: string | null;
	isLoading: boolean;
	titleRevealThreadId: string | null;
	titleRevealToken: number;
	titleGeneratingThreadId: string | null;
	onThreadSelect: (thread: ChatbotThread) => void;
	onRenameThread: (id: string, title: string) => Promise<boolean>;
	onTogglePinThread: (id: string, pinned: boolean) => Promise<boolean>;
	onDeleteThread: (id: string) => Promise<boolean>;
};

type ChatbotChatSectionProps = ThreadListHandlers & {
	icon: ComponentType<{ className?: string }>;
	label: string;
	toggleLabel: string;
	threads: ChatbotThread[];
	emptyText: string;
	showSkeleton?: boolean;
};

function ChatbotChatSection({
	icon: Icon,
	label,
	toggleLabel,
	threads,
	emptyText,
	showSkeleton = false,
	...listHandlers
}: ChatbotChatSectionProps) {
	const hasThreads = threads.length > 0 || showSkeleton;

	return (
		<Collapsible defaultOpen className="flex w-full flex-col gap-1">
			<CollapsibleTrigger
				className="group/section flex w-full items-center gap-1 rounded-md py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
				aria-label={toggleLabel}
			>
				<Icon className="size-4 shrink-0 text-text-secondary" />
				<span className="flex-1 text-mini font-semibold tracking-wide text-text-secondary">
					{label}
				</span>
				<ChevronDown className="size-4 shrink-0 text-text-secondary transition-transform group-data-[state=closed]/section:-rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				{hasThreads ? (
					<ChatbotThreadList
						threads={threads}
						uiVariant="compact"
						{...listHandlers}
					/>
				) : (
					<p className="py-2 text-small font-medium text-brand-secondary">
						{emptyText}
					</p>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

function ChatbotSidebarResizeHandle({
	onResizeStart,
	onResize,
	onResizeEnd,
}: {
	onResizeStart: () => void;
	onResize: (clientX: number) => void;
	onResizeEnd: () => void;
}) {
	const { state, isMobile } = useSidebar();

	const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		onResizeStart();
		const handleMove = (moveEvent: PointerEvent) => onResize(moveEvent.clientX);
		const handleUp = () => {
			onResizeEnd();
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerup", handleUp);
		};
		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerup", handleUp);
	};

	if (isMobile || state !== "expanded") return null;

	return (
		<button
			type="button"
			aria-label={CHATBOT_PAGE_CONTENT.sidebarResizeHandleLabel}
			onPointerDown={handlePointerDown}
			className="absolute inset-y-0 right-0 z-30 hidden w-2 translate-x-1/2 cursor-col-resize touch-none select-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-sidebar-border after:transition-colors hover:after:bg-brand-primary md:block"
		/>
	);
}

function ChatbotSidebarInner({
	activeThreadId,
	onNewConversation,
	onThreadSelect,
}: Omit<ChatbotSidebarProps, "children">) {
	const { state, setOpen } = useSidebar();
	const [searchQuery, setSearchQuery] = useState("");

	const {
		threads,
		threadsLoading,
		titleRevealThreadId,
		titleRevealToken,
		titleGeneratingThreadId,
		renameThread,
		togglePinThread,
		deleteThread,
	} = useChatbotStore();

	const isInitialLoading = threadsLoading && threads.length === 0;

	const { pinnedThreads, recentThreads } = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();
		const filtered = normalizedQuery
			? threads.filter((thread) =>
					thread.title.toLowerCase().includes(normalizedQuery),
				)
			: threads;
		return {
			pinnedThreads: filtered.filter((thread) => thread.pinned),
			recentThreads: filtered.filter((thread) => !thread.pinned),
		};
	}, [threads, searchQuery]);

	const listHandlers: ThreadListHandlers = {
		activeThreadId,
		isLoading: threadsLoading,
		titleRevealThreadId,
		titleRevealToken,
		titleGeneratingThreadId,
		onThreadSelect,
		onRenameThread: renameThread,
		onTogglePinThread: togglePinThread,
		onDeleteThread: deleteThread,
	};

	const isSearching = searchQuery.trim().length > 0;
	const recentEmptyText = isSearching
		? CHATBOT_THREAD_CONTENT.noChatsFound
		: CHATBOT_THREAD_CONTENT.emptyState;
	const pinnedEmptyText = isSearching
		? CHATBOT_THREAD_CONTENT.noChatsFound
		: CHATBOT_THREAD_CONTENT.noPinnedChats;

	const toggleLabel =
		state === "collapsed"
			? CHATBOT_PAGE_CONTENT.expandSidebarLabel
			: CHATBOT_PAGE_CONTENT.collapseSidebarLabel;

	const handleExpandSidebar = () => setOpen(true);

	return (
		<div className="flex h-full w-full flex-col bg-content-bg">
			<div className="flex h-16 shrink-0 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
				<div className="flex min-w-0 max-w-48 items-center gap-2 overflow-hidden opacity-100 transition-[max-width,opacity] duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
					<div className="flex size-7 shrink-0 items-center justify-center text-link">
						<Bot className="size-7" strokeWidth={2.25} />
					</div>
					<span className="whitespace-nowrap text-heading-4 font-semibold leading-heading-4 text-link">
						{CHATBOT_BOT_NAME}
					</span>
				</div>
				<SidebarTrigger
					className="size-9 shrink-0 rounded-lg text-icon-primary group-data-[collapsible=icon]:bg-card-foreground group-data-[collapsible=icon]:hover:bg-card-foreground/80"
					aria-label={toggleLabel}
				/>
			</div>

			<div className="flex shrink-0 flex-col gap-2 px-3 pb-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5">
				<Button
					type="button"
					onClick={onNewConversation}
					icon={Plus}
					aria-label={CHATBOT_PAGE_CONTENT.newConversationButton}
					className="w-full justify-center bg-info px-4 text-small font-semibold text-primary-foreground shadow-xs hover:bg-info/90 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-0"
				>
					<span className="group-data-[collapsible=icon]:hidden">
						{CHATBOT_PAGE_CONTENT.newConversationButton}
					</span>
				</Button>

				<InputGroup className="h-9 w-full bg-background group-data-[collapsible=icon]:hidden">
					<InputGroupAddon align="inline-start">
						<Search className="size-4 text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						placeholder={FORM_PLACEHOLDERS.searchChats}
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						aria-label={CHATBOT_PAGE_CONTENT.searchChatsAriaLabel}
					/>
				</InputGroup>

				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={handleExpandSidebar}
					icon={Search}
					aria-label={CHATBOT_PAGE_CONTENT.searchChatsAriaLabel}
					className="hidden text-text-secondary group-data-[collapsible=icon]:flex"
				/>
			</div>

			<SidebarContent className="gap-0 px-3 pb-4 group-data-[collapsible=icon]:hidden">
				{!isInitialLoading && (
					<>
						<ChatbotChatSection
							icon={Pin}
							label={CHATBOT_THREAD_CONTENT.pinnedChats}
							toggleLabel={CHATBOT_THREAD_CONTENT.togglePinnedChatsLabel}
							threads={pinnedThreads}
							emptyText={pinnedEmptyText}
							{...listHandlers}
						/>
						<Separator className="my-3 bg-sidebar-border" />
					</>
				)}
				<ChatbotChatSection
					icon={History}
					label={CHATBOT_THREAD_CONTENT.recentChats}
					toggleLabel={CHATBOT_THREAD_CONTENT.toggleRecentChatsLabel}
					threads={recentThreads}
					emptyText={recentEmptyText}
					showSkeleton={isInitialLoading}
					{...listHandlers}
				/>
			</SidebarContent>

			<div className="hidden flex-col items-center gap-2 px-2.5 group-data-[collapsible=icon]:flex">
				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={handleExpandSidebar}
					icon={Pin}
					aria-label={CHATBOT_THREAD_CONTENT.togglePinnedChatsLabel}
					className="text-text-secondary"
				/>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={handleExpandSidebar}
					icon={History}
					aria-label={CHATBOT_THREAD_CONTENT.toggleRecentChatsLabel}
					className="text-text-secondary"
				/>
			</div>
		</div>
	);
}

export function ChatbotSidebar({
	activeThreadId,
	onNewConversation,
	onThreadSelect,
	children,
}: ChatbotSidebarProps) {
	const [open, setOpen] = useState(true);
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const [isResizing, setIsResizing] = useState(false);

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen);
		// Always reopen at the default width, discarding any prior resize.
		if (!nextOpen) {
			setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
		}
	}, []);

	const handleResize = useCallback((clientX: number) => {
		const viewportWidth = window.innerWidth;
		const minWidth = (CHATBOT_SIDEBAR_DEFAULT_WIDTH_VW / 100) * viewportWidth;
		const maxWidth = (CHATBOT_SIDEBAR_MAX_WIDTH_VW / 100) * viewportWidth;
		const nextWidth = Math.min(Math.max(clientX, minWidth), maxWidth);
		setSidebarWidth(`${Math.round(nextWidth)}px`);
	}, []);

	const sidebarStyle = {
		"--sidebar-width": sidebarWidth,
		"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
	} as CSSProperties;

	return (
		<SidebarProvider
			open={open}
			onOpenChange={handleOpenChange}
			className={cn(
				"h-full min-h-0",
				isResizing &&
					"select-none [&_[data-slot=sidebar-container]]:transition-none [&_[data-slot=sidebar-gap]]:transition-none",
			)}
			style={sidebarStyle}
		>
			<Sidebar collapsible="icon" className="border-sidebar-border">
				<ChatbotSidebarInner
					activeThreadId={activeThreadId}
					onNewConversation={onNewConversation}
					onThreadSelect={onThreadSelect}
				/>
				<ChatbotSidebarResizeHandle
					onResizeStart={() => setIsResizing(true)}
					onResize={handleResize}
					onResizeEnd={() => setIsResizing(false)}
				/>
			</Sidebar>
			<SidebarInset className="min-h-0 min-w-0 bg-background">
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
