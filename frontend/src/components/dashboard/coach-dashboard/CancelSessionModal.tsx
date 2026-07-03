// Figma layer: "Calendar - Cancel Session" — node 4:21822
/*
 * SEMANTIC ANALYSIS
 * Modal (overlay + 500px popup) opened from a session's "Cancel Session" action.
 * - Header: title "Cancel Session" + close (X) → ContentModal header row
 * - Reason (required) → Textarea
 * - "On cancelling, client will be notified…" → Switch (default on)
 * - Footer: Cancel (outline) + Cancel Session (destructive) with validation
 */
import { useEffect, useState } from "react";
import { ContentModal } from "@/components/common/ContentModal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COACH_DASHBOARD_CONTENT } from "@/const";
import { cn } from "@/lib/utils";

const M = COACH_DASHBOARD_CONTENT.cancelSessionModal;

export interface CancelSessionValues {
	reason: string;
	notify: boolean;
}

export interface CancelSessionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm?: (values: CancelSessionValues) => void;
}

export function CancelSessionModal({
	open,
	onOpenChange,
	onConfirm,
}: CancelSessionModalProps) {
	const [reason, setReason] = useState("");
	const [notify, setNotify] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (!open) return;
		setReason("");
		setNotify(true);
		setSaving(false);
		setError(undefined);
	}, [open]);

	const handleConfirm = () => {
		if (!reason.trim()) {
			setError(M.requiredError);
			return;
		}
		setError(undefined);
		setSaving(true);
		// Placeholder async action until the cancel-session API is wired up.
		onConfirm?.({ reason: reason.trim(), notify });
		setTimeout(() => {
			setSaving(false);
			onOpenChange(false);
		}, 1000);
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={(next) => {
				if (saving) return;
				onOpenChange(next);
			}}
			title={M.title}
			contentClassName="w-full max-w-[500px] gap-0 overflow-hidden rounded-xl border border-border p-0"
		>
			<div className="flex flex-col gap-6 p-6">
				{/* Reason */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="cancel-reason"
						className="gap-1 text-small font-medium text-text-foreground"
					>
						<span className="text-destructive" aria-hidden>
							*
						</span>
						{M.reasonLabel}
					</Label>
					<Textarea
						id="cancel-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder={M.reasonPlaceholder}
						aria-invalid={!!error}
						className={cn(
							"min-h-[76px] resize-y rounded-lg border-border text-small text-text-foreground shadow-none",
							error && "border-destructive",
						)}
					/>
					{error ? (
						<p className="text-mini text-destructive" role="alert">
							{error}
						</p>
					) : null}
				</div>

				{/* Notify switch */}
				<div className="flex items-center gap-2">
					<Switch
						checked={notify}
						onCheckedChange={setNotify}
						aria-label={M.notifyLabel}
					/>
					<span className="text-small text-text-foreground">
						{M.notifyLabel}
					</span>
				</div>
			</div>

			<DialogFooter className="mt-0 gap-2 border-t border-border px-6 py-5 sm:gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={saving}
					onClick={() => onOpenChange(false)}
				>
					{M.cancel}
				</Button>
				<Button
					type="button"
					variant="destructive"
					isLoading={saving}
					onClick={handleConfirm}
				>
					{M.confirm}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
