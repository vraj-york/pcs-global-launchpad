// Figma layer: "Calendar - Reschedule Session" — node 4:21733
/*
 * SEMANTIC ANALYSIS
 * Modal (overlay + 500px popup) opened from a session's "Reschedule" action.
 * - Header: title + description + close (X) → ContentModal header row
 * - New Date (required) → DatePickerInput (calendar popover)
 * - New Time (required, info tooltip "…15 min.") → time-range popover
 *   (Start / End native time inputs; End defaults to Start + 15 min)
 * - Additional Notes (optional) → Textarea (prefilled from the session)
 * - "Notify client…" → Switch (default on)
 * - Footer: Cancel (outline) + Confirm Reschedule (primary) with validation
 */
import { useEffect, useState } from "react";
import { ContentModal } from "@/components/common/ContentModal";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COACH_DASHBOARD_CONTENT } from "@/const";
import { TimeRangeField } from "./TimeRangeField";

const M = COACH_DASHBOARD_CONTENT.rescheduleModal;

export interface RescheduleValues {
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
	notify: boolean;
}

export interface RescheduleSessionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Prefills the Additional Notes textarea (e.g. the session's description). */
	defaultNotes?: string;
	onConfirm?: (values: RescheduleValues) => Promise<boolean> | boolean;
}

export function RescheduleSessionModal({
	open,
	onOpenChange,
	defaultNotes,
	onConfirm,
}: RescheduleSessionModalProps) {
	const [date, setDate] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [notes, setNotes] = useState(defaultNotes ?? "");
	const [notify, setNotify] = useState(true);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<{ date?: string; time?: string }>({});

	useEffect(() => {
		if (!open) return;
		setDate("");
		setStartTime("");
		setEndTime("");
		setNotes(defaultNotes ?? "");
		setNotify(true);
		setSaving(false);
		setErrors({});
	}, [open, defaultNotes]);

	const handleConfirm = async () => {
		const nextErrors: { date?: string; time?: string } = {};
		if (!date) nextErrors.date = M.requiredError;
		if (!startTime || !endTime) nextErrors.time = M.requiredError;
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSaving(true);
		try {
			const success = await onConfirm?.({
				date,
				startTime,
				endTime,
				notes,
				notify,
			});
			if (success === false) return;
			setSaving(false);
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={(next) => {
				if (saving) return;
				onOpenChange(next);
			}}
			title={M.title}
			description={M.description}
			contentClassName="w-full max-w-[500px] gap-0 overflow-hidden rounded-xl border border-border p-0"
		>
			<div className="flex flex-col gap-6 p-6">
				{/* New Date */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="reschedule-date"
						className="gap-1 text-small font-medium text-text-foreground"
					>
						<span className="text-destructive" aria-hidden>
							*
						</span>
						{M.newDateLabel}
					</Label>
					<DatePickerInput
						id="reschedule-date"
						value={date}
						onChange={setDate}
						placeholder={M.newDatePlaceholder}
						error={errors.date}
						className="space-y-1"
						inputClassName="rounded-lg"
					/>
				</div>

				{/* New Time */}
				<TimeRangeField
					start={startTime}
					end={endTime}
					onChange={(nextStart, nextEnd) => {
						setStartTime(nextStart);
						setEndTime(nextEnd);
					}}
					label={M.newTimeLabel}
					tooltip={M.newTimeTooltip}
					placeholder={M.newTimePlaceholder}
					startLabel={M.startTimeLabel}
					endLabel={M.endTimeLabel}
					error={errors.time}
				/>

				{/* Additional Notes */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="reschedule-notes"
						className="text-small font-medium text-text-foreground"
					>
						{M.notesLabel}
					</Label>
					<Textarea
						id="reschedule-notes"
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						className="min-h-[76px] resize-y rounded-lg border-border text-small text-text-foreground shadow-none"
					/>
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
				<Button type="button" isLoading={saving} onClick={handleConfirm}>
					{M.confirm}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
