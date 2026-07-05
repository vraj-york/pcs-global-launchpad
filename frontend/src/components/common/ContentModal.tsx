import { X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";

type ContentModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
	/** Optional class for the content container */
	contentClassName?: string;
	/** Set to false to hide the close (X) button */
	showCloseButton?: boolean;
	/** When provided, renders a header row with title, description, and close button aligned on one row */
	title?: React.ReactNode;
	/** Shown below title when title is provided */
	description?: React.ReactNode;
};

/**
 * Reusable modal with backdrop, popup container, and close action.
 * When title (and optional description) are provided, the close button is rendered in the same row as the title.
 * Otherwise all content is passed as children and the close button is absolutely positioned.
 */
export function ContentModal({
	open,
	onOpenChange,
	children,
	contentClassName,
	showCloseButton = true,
	title,
	description,
}: ContentModalProps) {
	const hasHeaderRow = title != null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={!hasHeaderRow && showCloseButton}
				className={contentClassName}
			>
				{hasHeaderRow ? (
					<>
						<div className="flex items-start gap-4 border-b border-border px-6 pb-6 pt-6">
							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<DialogTitle>{title}</DialogTitle>
								{description != null && (
									<DialogDescription>{description}</DialogDescription>
								)}
							</div>
							{showCloseButton && (
								<DialogClose asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-9 shrink-0 rounded-lg bg-card p-2 text-icon-secondary hover:bg-muted hover:text-text-foreground"
										aria-label="Close"
									>
										<X className="size-4" aria-hidden />
									</Button>
								</DialogClose>
							)}
						</div>
						{children}
					</>
				) : (
					children
				)}
			</DialogContent>
		</Dialog>
	);
}
