// Figma layer: "Sessions - View Reason" — node 4:21775
/*
 * SEMANTIC ANALYSIS
 * Modal (overlay + 640px popup) opened from a cancelled request's "View Reason".
 * - Header: title "View Reason" + close (X) → ContentModal header row
 * - Body: read-only cancellation reason paragraph
 * - Footer: Cancel (outline) + "Okay, Understood" (primary) — both dismiss
 */
import { ContentModal } from "@/components/common/ContentModal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { COACH_DASHBOARD_CONTENT } from "@/const";

const V = COACH_DASHBOARD_CONTENT.sessionsPage.requests.viewReasonModal;

export interface ViewReasonModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reason: string;
}

export function ViewReasonModal({
	open,
	onOpenChange,
	reason,
}: ViewReasonModalProps) {
	return (
		<ContentModal
			open={open}
			onOpenChange={onOpenChange}
			title={V.title}
			contentClassName="w-full max-w-[640px] gap-0 overflow-hidden rounded-xl border border-border p-0"
		>
			<div className="flex flex-col gap-6 p-6">
				<p className="text-small text-text-foreground">{reason}</p>
			</div>

			<DialogFooter className="mt-0 gap-2 border-t border-border px-6 py-5 sm:gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => onOpenChange(false)}
				>
					{V.cancel}
				</Button>
				<Button type="button" onClick={() => onOpenChange(false)}>
					{V.confirm}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
