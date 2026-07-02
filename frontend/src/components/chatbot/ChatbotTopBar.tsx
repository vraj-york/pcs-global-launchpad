import {
	FileText,
	Maximize2,
	MoreHorizontal,
	Pin,
	PinOff,
	SquarePen,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatbotExportModal } from "@/components";
import { ConfirmationModal } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CHATBOT_PAGE_CONTENT,
	CHATBOT_THREAD_CONTENT,
	FORM_PLACEHOLDERS,
} from "@/const";
import type { ChatbotThread, ChatbotTopBarProps } from "@/types";

function RenameDialog({
	thread,
	onConfirm,
	onClose,
}: {
	thread: ChatbotThread;
	onConfirm: (title: string) => Promise<void>;
	onClose: () => void;
}) {
	const [value, setValue] = useState(thread.title);
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setValue(thread.title);
	}, [thread.title]);

	const handleSubmit = async () => {
		const trimmed = value.trim();
		if (!trimmed || trimmed === thread.title) {
			onClose();
			return;
		}
		setIsSaving(true);
		await onConfirm(trimmed);
		setIsSaving(false);
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void handleSubmit();
		} else if (e.key === "Escape") {
			onClose();
		}
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !isSaving) onClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="flex max-w-sm flex-col gap-0 p-0"
			>
				<div className="flex flex-col gap-4 p-6">
					<DialogTitle className="text-base font-semibold text-text-foreground">
						{CHATBOT_THREAD_CONTENT.rename}
					</DialogTitle>
					<Input
						ref={inputRef}
						autoFocus
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={FORM_PLACEHOLDERS.conversationName}
						disabled={isSaving}
						className="h-9"
					/>
				</div>
				<div className="flex gap-2 border-t border-border px-6 py-4">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						disabled={isSaving}
						onClick={onClose}
					>
						{CHATBOT_THREAD_CONTENT.deleteCancelLabel}
					</Button>
					<Button
						type="button"
						className="flex-1"
						disabled={isSaving || !value.trim()}
						onClick={() => void handleSubmit()}
					>
						{CHATBOT_THREAD_CONTENT.rename}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function ChatbotTopBar({
	clientId,
	clientOptions,
	showClientSelect,
	isLoading,
	onClientChange,
	onClose,
	onExpand,
	activeThread,
	onRenameThread,
	onTogglePinThread,
	onDeleteThread,
}: ChatbotTopBarProps) {
	const [deletingThread, setDeletingThread] = useState<ChatbotThread | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);
	const [exportingThread, setExportingThread] = useState<ChatbotThread | null>(
		null,
	);
	const [renamingThread, setRenamingThread] = useState<ChatbotThread | null>(
		null,
	);

	const handleDeleteConfirm = async () => {
		if (!deletingThread || !onDeleteThread) return;
		setIsDeleting(true);
		await onDeleteThread(deletingThread.id);
		setIsDeleting(false);
		setDeletingThread(null);
	};

	const handleRenameConfirm = async (newTitle: string) => {
		if (!renamingThread || !onRenameThread) return;
		await onRenameThread(renamingThread.id, newTitle);
	};

	return (
		<div className="flex h-16 items-center justify-between border-b border-border-muted bg-background px-4">
			<div className="flex min-w-0 items-center gap-3">
				{showClientSelect && (
					<Select
						value={clientId}
						onValueChange={onClientChange}
						disabled={isLoading}
					>
						<SelectTrigger
							size="sm"
							className="h-9 w-52 rounded-lg border-border-muted bg-background text-text-foreground shadow-xs"
							aria-label={CHATBOT_PAGE_CONTENT.clientIdLabel}
						>
							<SelectValue placeholder={FORM_PLACEHOLDERS.selectClient} />
						</SelectTrigger>
						<SelectContent>
							{clientOptions.map((client) => (
								<SelectItem key={client.value} value={client.value}>
									{client.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				{activeThread && (
					<span className="truncate text-base font-semibold text-text-foreground">
						{activeThread.title}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1">
				{activeThread && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-text-foreground transition-colors hover:bg-muted/80"
								aria-label={CHATBOT_THREAD_CONTENT.moreActionsLabel}
							>
								<MoreHorizontal className="size-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" sideOffset={6} className="w-44">
							<DropdownMenuItem
								onClick={() =>
									onTogglePinThread?.(activeThread.id, !activeThread.pinned)
								}
							>
								{activeThread.pinned ? (
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
							<DropdownMenuItem onClick={() => setRenamingThread(activeThread)}>
								<SquarePen className="size-4" />
								{CHATBOT_THREAD_CONTENT.rename}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => setExportingThread(activeThread)}
							>
								<FileText className="size-4" />
								{CHATBOT_THREAD_CONTENT.saveAsPdf}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setDeletingThread(activeThread)}
							>
								<Trash2 className="size-4" />
								{CHATBOT_THREAD_CONTENT.delete}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				<button
					type="button"
					onClick={onExpand}
					className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-text-foreground transition-colors hover:bg-muted/80"
					aria-label={CHATBOT_THREAD_CONTENT.compactButtonLabel}
				>
					<Maximize2 className="size-4" />
				</button>

				<button
					type="button"
					onClick={onClose}
					className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-text-foreground transition-colors hover:bg-muted/80"
					aria-label={CHATBOT_PAGE_CONTENT.closeButtonLabel}
				>
					<X className="size-4" />
				</button>
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

			{renamingThread && (
				<RenameDialog
					thread={renamingThread}
					onConfirm={handleRenameConfirm}
					onClose={() => setRenamingThread(null)}
				/>
			)}

			<ChatbotExportModal
				thread={exportingThread}
				onClose={() => setExportingThread(null)}
			/>
		</div>
	);
}
