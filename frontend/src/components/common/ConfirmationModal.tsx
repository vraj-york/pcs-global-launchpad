import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmationModalVariant = "destructive" | "default";

type ConfirmationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description: React.ReactNode;
	/** Icon shown in the header media area (e.g. Building2, RotateCcw) */
	icon: React.ReactNode;
	confirmLabel: React.ReactNode;
	/** Omit when `ack` — acknowledgement shows a single action only */
	cancelLabel?: React.ReactNode;
	onConfirm: () => void | Promise<void>;
	/** Success acknowledgement: single primary button, success icon background */
	ack?: boolean;
	/** When true, confirm button shows spinner and both buttons are disabled */
	isConfirming?: boolean;
	/** Styling for the confirm button */
	variant?: ConfirmationModalVariant;
	/** Optional Lucide icon inside the confirm button (e.g. Trash2). Hidden while isConfirming. */
	confirmIcon?: LucideIcon;
	/** Optional class for the content wrapper */
	contentClassName?: string;
};

/**
 * Reusable dialog with icon, title, description, and actions.
 * Use `ack` for post-success acknowledgement (single primary button, success icon area).
 */
export function ConfirmationModal({
	open,
	onOpenChange,
	title,
	description,
	icon,
	confirmLabel,
	cancelLabel,
	onConfirm,
	isConfirming = false,
	variant = "default",
	confirmIcon,
	contentClassName,
	ack = false,
}: ConfirmationModalProps) {
	const handleConfirm = () => {
		void onConfirm();
	};

	const handleCancel = () => {
		if (!isConfirming) onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					"flex max-w-96 flex-col gap-0 p-0 w-full",
					contentClassName,
				)}
			>
				<div className="flex flex-col items-center justify-center gap-6 p-8">
					<div className="flex w-full max-w-full flex-col items-center justify-center gap-6 text-center">
						<div
							className={cn(
								"flex size-20 shrink-0 items-center justify-center rounded-2xl",
								ack
									? "bg-success-bg"
									: variant === "destructive"
										? "bg-destructive/10"
										: "bg-info-bg",
							)}
							aria-hidden
						>
							{icon}
						</div>
						<div className="flex max-w-96 flex-col items-center gap-1.5 text-center">
							<DialogTitle className="text-xl font-semibold leading-6 text-text-foreground">
								{title}
							</DialogTitle>
							<DialogDescription className="text-sm leading-[21px] text-muted-foreground">
								{description}
							</DialogDescription>
						</div>
					</div>
				</div>
				<div className="flex w-full flex-col gap-2 border-t border-border px-6 py-5">
					<Button
						type="button"
						variant={variant === "destructive" ? "destructive" : "default"}
						className="w-full"
						icon={!ack ? confirmIcon : undefined}
						isLoading={isConfirming}
						onClick={handleConfirm}
					>
						{confirmLabel}
					</Button>
					{!ack && cancelLabel != null ? (
						<Button
							type="button"
							variant="outline"
							className="w-full"
							disabled={isConfirming}
							onClick={handleCancel}
						>
							{cancelLabel}
						</Button>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
