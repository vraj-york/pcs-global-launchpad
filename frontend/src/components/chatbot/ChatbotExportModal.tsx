import { Download, Info, MessagesSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { chatbotThreadsApi } from "@/api";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { CHATBOT_EXPORT_CONTENT } from "@/const";
import { useUsersStore } from "@/store";
import type { ChatbotExportModalProps } from "@/types";

export function ChatbotExportModal({
	thread,
	onClose,
}: ChatbotExportModalProps) {
	const [isExporting, setIsExporting] = useState(false);
	const { fullName } = useUsersStore();
	const displayName = fullName || "User";

	const handleExport = async () => {
		if (!thread || isExporting) return;
		setIsExporting(true);

		const result = await chatbotThreadsApi.exportThread(
			thread.id,
			thread.title,
			displayName,
		);

		setIsExporting(false);

		if (result.ok) {
			onClose();
			toast.success(CHATBOT_EXPORT_CONTENT.successTitle, {
				description: CHATBOT_EXPORT_CONTENT.successDescription,
			});
		} else {
			toast.error(CHATBOT_EXPORT_CONTENT.errorTitle, {
				description: result.message || CHATBOT_EXPORT_CONTENT.errorDescription,
			});
		}
	};

	return (
		<Dialog
			open={thread !== null}
			onOpenChange={(open) => {
				if (!open && !isExporting) onClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="flex w-full max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-lg ring-0"
			>
				<div className="flex flex-col items-center gap-6 p-8">
					<div
						className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-info-bg p-4"
						aria-hidden
					>
						<MessagesSquare
							className="size-8 text-interactive-info"
							strokeWidth={1.75}
						/>
					</div>

					<div className="flex w-full flex-col items-center gap-2 text-center">
						<DialogTitle className="w-full text-heading-4 font-semibold leading-heading-4 text-text-foreground">
							{CHATBOT_EXPORT_CONTENT.modalTitle}
						</DialogTitle>
						<DialogDescription className="w-full text-small font-normal leading-small text-text-secondary">
							{CHATBOT_EXPORT_CONTENT.modalDescription}
						</DialogDescription>
					</div>

					<div
						role="status"
						className="flex w-full gap-3 rounded-xl bg-info-bg p-4"
					>
						<Info
							className="mt-0.5 size-4 shrink-0 text-icon-info"
							aria-hidden
						/>
						<div className="flex min-w-0 flex-1 flex-col gap-px">
							<p className="text-small font-bold leading-small text-text-foreground">
								{CHATBOT_EXPORT_CONTENT.privacyNoteTitle}
							</p>
							<p className="text-small font-normal leading-small text-text-foreground">
								{CHATBOT_EXPORT_CONTENT.privacyNoteBody}
							</p>
						</div>
					</div>
				</div>

				<div className="flex w-full flex-col gap-2 border-t border-border px-6 py-5">
					<Button
						type="button"
						className="w-full"
						icon={Download}
						isLoading={isExporting}
						onClick={handleExport}
					>
						{isExporting
							? CHATBOT_EXPORT_CONTENT.loadingLabel
							: CHATBOT_EXPORT_CONTENT.confirmLabel}
					</Button>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						disabled={isExporting}
						onClick={onClose}
					>
						{CHATBOT_EXPORT_CONTENT.cancelLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
