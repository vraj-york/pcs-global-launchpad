// Figma layer: "Calendar - Schedule New Session" — node 4:21751
/*
 * SEMANTIC ANALYSIS
 * Modal (overlay + 640px popup) opened from a "Schedule Session" action.
 * - Header: title + description + close (X) → ContentModal header row
 * - Session Title (required) → Input
 * - Date (required) → DatePickerInput (calendar popover)  ─┐ same wrap row
 * - Time (required, info tooltip "…15 min.") → TimeRangeField ─┘
 * - Client (required) → Select
 * - Description (optional) → Textarea
 * - "On scheduling, client will be notified…" → Switch (default on)
 * - Footer: Cancel (outline) + Schedule Session (primary) with validation
 */
import { useEffect, useState } from "react";
import { ContentModal } from "@/components/common/ContentModal";
import { DatePickerInput } from "@/components/common/DatePickerInput";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COACH_DASHBOARD_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import { TimeRangeField } from "./TimeRangeField";

const S = COACH_DASHBOARD_CONTENT.scheduleModal;

export interface ScheduleSessionValues {
	title: string;
	date: string;
	startTime: string;
	endTime: string;
	clientId: string;
	description: string;
	notify: boolean;
}

export interface ScheduleSessionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm?: (values: ScheduleSessionValues) => void;
}

export function ScheduleSessionModal({
	open,
	onOpenChange,
	onConfirm,
}: ScheduleSessionModalProps) {
	const [title, setTitle] = useState("");
	const [date, setDate] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [clientId, setClientId] = useState("");
	const [description, setDescription] = useState("");
	const [notify, setNotify] = useState(true);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<{
		title?: string;
		date?: string;
		time?: string;
		client?: string;
	}>({});

	useEffect(() => {
		if (!open) return;
		setTitle("");
		setDate("");
		setStartTime("");
		setEndTime("");
		setClientId("");
		setDescription("");
		setNotify(true);
		setSaving(false);
		setErrors({});
	}, [open]);

	const handleConfirm = () => {
		const nextErrors: typeof errors = {};
		if (!title.trim()) nextErrors.title = S.requiredError;
		if (!date) nextErrors.date = S.requiredError;
		if (!startTime || !endTime) nextErrors.time = S.requiredError;
		if (!clientId) nextErrors.client = S.requiredError;
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSaving(true);
		// Placeholder async action until the schedule-session API is wired up.
		onConfirm?.({
			title: title.trim(),
			date,
			startTime,
			endTime,
			clientId,
			description,
			notify,
		});
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
			title={S.title}
			description={S.description}
			contentClassName="w-full max-w-[640px] gap-0 overflow-hidden rounded-xl border border-border p-0"
		>
			<div className="flex flex-col gap-6 p-6">
				{/* Session Title */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="schedule-title"
						className="gap-1 text-small font-medium text-text-foreground"
					>
						<span className="text-destructive" aria-hidden>
							*
						</span>
						{S.sessionTitleLabel}
					</Label>
					<Input
						id="schedule-title"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder={S.sessionTitlePlaceholder}
						aria-invalid={!!errors.title}
						className={cn("h-10 rounded-lg", errors.title && "border-destructive")}
					/>
					{errors.title ? (
						<p className="text-mini text-destructive" role="alert">
							{errors.title}
						</p>
					) : null}
				</div>

				{/* Date + Time (two columns, wraps on narrow) */}
				<div className="flex flex-wrap gap-6">
					<div className="flex min-w-[240px] flex-1 flex-col gap-1">
						<Label
							htmlFor="schedule-date"
							className="gap-1 text-small font-medium text-text-foreground"
						>
							<span className="text-destructive" aria-hidden>
								*
							</span>
							{S.dateLabel}
						</Label>
						<DatePickerInput
							id="schedule-date"
							value={date}
							onChange={setDate}
							placeholder={S.datePlaceholder}
							error={errors.date}
							className="space-y-1"
							inputClassName="rounded-lg"
						/>
					</div>
					<div className="flex min-w-[240px] flex-1 flex-col">
						<TimeRangeField
							start={startTime}
							end={endTime}
							onChange={(nextStart, nextEnd) => {
								setStartTime(nextStart);
								setEndTime(nextEnd);
							}}
							label={S.timeLabel}
							tooltip={S.timeTooltip}
							placeholder={S.timePlaceholder}
							startLabel={S.startTimeLabel}
							endLabel={S.endTimeLabel}
							error={errors.time}
						/>
					</div>
				</div>

				{/* Client */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="schedule-client"
						className="gap-1 text-small font-medium text-text-foreground"
					>
						<span className="text-destructive" aria-hidden>
							*
						</span>
						{S.clientLabel}
					</Label>
					<Select value={clientId} onValueChange={setClientId}>
						<SelectTrigger
							id="schedule-client"
							aria-invalid={!!errors.client}
							className={cn(
								"h-10 w-full rounded-lg",
								errors.client && "border-destructive",
							)}
						>
							<SelectValue placeholder={S.clientPlaceholder} />
						</SelectTrigger>
						<SelectContent>
							{S.clients.map((client) => (
								<SelectItem key={client.id} value={client.id}>
									{client.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.client ? (
						<p className="text-mini text-destructive" role="alert">
							{errors.client}
						</p>
					) : null}
				</div>

				{/* Description */}
				<div className="flex flex-col gap-1">
					<Label
						htmlFor="schedule-description"
						className="text-small font-medium text-text-foreground"
					>
						{S.descriptionLabel}
					</Label>
					<Textarea
						id="schedule-description"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder={S.descriptionPlaceholder}
						className="min-h-[76px] resize-y rounded-lg border-border text-small text-text-foreground shadow-none"
					/>
				</div>

				{/* Notify switch */}
				<div className="flex items-center gap-2">
					<Switch
						checked={notify}
						onCheckedChange={setNotify}
						aria-label={S.notifyLabel}
					/>
					<span className="text-small text-text-foreground">
						{S.notifyLabel}
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
					{S.cancel}
				</Button>
				<Button type="button" isLoading={saving} onClick={handleConfirm}>
					{S.confirm}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
