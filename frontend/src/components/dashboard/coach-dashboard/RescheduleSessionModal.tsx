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
import { Clock, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { ContentModal } from "@/components/common/ContentModal";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { COACH_DASHBOARD_CONTENT } from "@/const";
import { cn } from "@/lib/utils";

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
	onConfirm?: (values: RescheduleValues) => void;
}

/** "HH:mm" (24h) → "h:mm AM/PM". */
function to12h(value: string): string {
	const [hStr, mStr] = value.split(":");
	const h = Number(hStr);
	const m = Number(mStr);
	if (Number.isNaN(h) || Number.isNaN(m)) return value;
	const period = h >= 12 ? "PM" : "AM";
	const hh = h % 12 === 0 ? 12 : h % 12;
	return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

/** Add `mins` to an "HH:mm" time, wrapping within a day. */
function addMinutes(value: string, mins: number): string {
	const [hStr, mStr] = value.split(":");
	const total = (Number(hStr) * 60 + Number(mStr) + mins) % (24 * 60);
	const nh = Math.floor(total / 60);
	const nm = total % 60;
	return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function TimeRangeField({
	start,
	end,
	onChange,
	error,
}: {
	start: string;
	end: string;
	onChange: (start: string, end: string) => void;
	error?: string;
}) {
	const [open, setOpen] = useState(false);
	const hasValue = Boolean(start && end);

	return (
		<div className="flex flex-col gap-1">
			<Label className="gap-1 text-small font-medium text-text-foreground">
				<span className="text-destructive" aria-hidden>
					*
				</span>
				{M.newTimeLabel}
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							className="inline-flex text-info"
							aria-label={M.newTimeTooltip}
						>
							<Info className="size-3.5" aria-hidden />
						</button>
					</TooltipTrigger>
					<TooltipContent>{M.newTimeTooltip}</TooltipContent>
				</Tooltip>
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						data-empty={!hasValue}
						aria-invalid={!!error}
						className={cn(
							"h-10 w-full justify-between rounded-lg font-normal data-[empty=true]:text-muted-foreground",
							error && "border-destructive",
						)}
					>
						{hasValue ? (
							`${to12h(start)} - ${to12h(end)}`
						) : (
							<span>{M.newTimePlaceholder}</span>
						)}
						<Clock className="size-4 shrink-0 opacity-50" aria-hidden />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-[var(--radix-popover-trigger-width)] p-3"
				>
					<div className="flex items-end gap-2">
						<div className="flex flex-1 flex-col gap-1">
							<Label
								htmlFor="reschedule-start"
								className="text-mini font-medium text-text-secondary"
							>
								{M.startTimeLabel}
							</Label>
							<Input
								id="reschedule-start"
								type="time"
								value={start}
								onChange={(event) => {
									const nextStart = event.target.value;
									onChange(
										nextStart,
										end || (nextStart ? addMinutes(nextStart, 15) : ""),
									);
								}}
							/>
						</div>
						<span className="pb-2 text-muted-foreground">-</span>
						<div className="flex flex-1 flex-col gap-1">
							<Label
								htmlFor="reschedule-end"
								className="text-mini font-medium text-text-secondary"
							>
								{M.endTimeLabel}
							</Label>
							<Input
								id="reschedule-end"
								type="time"
								value={end}
								onChange={(event) => onChange(start, event.target.value)}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{error ? (
				<p className="text-mini text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
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

	const handleConfirm = () => {
		const nextErrors: { date?: string; time?: string } = {};
		if (!date) nextErrors.date = M.requiredError;
		if (!startTime || !endTime) nextErrors.time = M.requiredError;
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSaving(true);
		// Placeholder async action until the reschedule API is wired up.
		onConfirm?.({ date, startTime, endTime, notes, notify });
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
