// Shared "Start time – End time" range field used by the Schedule / Reschedule
// session modals (Figma nodes 4:21751 / 4:21733). A styled input-trigger opens a
// popover with Start / End native time inputs; End defaults to Start + 15 min.
import { Clock, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** "HH:mm" (24h) → "h:mm AM/PM". */
export function to12h(value: string): string {
	const [hStr, mStr] = value.split(":");
	const h = Number(hStr);
	const m = Number(mStr);
	if (Number.isNaN(h) || Number.isNaN(m)) return value;
	const period = h >= 12 ? "PM" : "AM";
	const hh = h % 12 === 0 ? 12 : h % 12;
	return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

/** Add `mins` to an "HH:mm" time, wrapping within a day. */
export function addMinutes(value: string, mins: number): string {
	const [hStr, mStr] = value.split(":");
	const total = (Number(hStr) * 60 + Number(mStr) + mins) % (24 * 60);
	const nh = Math.floor(total / 60);
	const nm = total % 60;
	return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export interface TimeRangeFieldProps {
	start: string;
	end: string;
	onChange: (start: string, end: string) => void;
	label: string;
	tooltip: string;
	placeholder: string;
	startLabel: string;
	endLabel: string;
	error?: string;
	required?: boolean;
}

export function TimeRangeField({
	start,
	end,
	onChange,
	label,
	tooltip,
	placeholder,
	startLabel,
	endLabel,
	error,
	required = true,
}: TimeRangeFieldProps) {
	const [open, setOpen] = useState(false);
	const hasValue = Boolean(start && end);

	return (
		<div className="flex flex-col gap-1">
			<Label className="gap-1 text-small font-medium text-text-foreground">
				{required ? (
					<span className="text-destructive" aria-hidden>
						*
					</span>
				) : null}
				{label}
				<Tooltip>
					<TooltipTrigger asChild>
						<button type="button" className="inline-flex text-info" aria-label={tooltip}>
							<Info className="size-3.5" aria-hidden />
						</button>
					</TooltipTrigger>
					<TooltipContent>{tooltip}</TooltipContent>
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
							<span>{placeholder}</span>
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
								htmlFor="time-range-start"
								className="text-mini font-medium text-text-secondary"
							>
								{startLabel}
							</Label>
							<Input
								id="time-range-start"
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
								htmlFor="time-range-end"
								className="text-mini font-medium text-text-secondary"
							>
								{endLabel}
							</Label>
							<Input
								id="time-range-end"
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
