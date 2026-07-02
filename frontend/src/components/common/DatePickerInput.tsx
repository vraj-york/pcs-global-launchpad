"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import * as React from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateToIsoString } from "@/utils/sharedUtils";

/** Parse `yyyy-MM-dd` as a calendar date in local time. */
function isoStringToDate(iso: string): Date | undefined {
	const trimmed = iso?.trim();
	if (!trimmed) return undefined;
	const parts = trimmed.split("-");
	if (parts.length !== 3) return undefined;
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	const d = Number(parts[2]);
	if (!y || !m || !d) return undefined;
	const dt = new Date(y, m - 1, d);
	return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export type DatePickerInputProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	error?: string;
	className?: string;
	inputClassName?: string;
	disabled?: boolean;
	/** ISO `yyyy-MM-dd`; days before this are disabled. */
	min?: string;
	/** ISO `yyyy-MM-dd`; days after this are disabled. */
	max?: string;
};

export function DatePickerInput({
	id,
	value,
	onChange,
	placeholder,
	error,
	className,
	inputClassName,
	disabled = false,
	min,
	max,
}: DatePickerInputProps) {
	const [open, setOpen] = React.useState(false);
	const popoverContentRef = React.useRef<HTMLDivElement>(null);
	const selected = isoStringToDate(value);

	React.useEffect(() => {
		if (!open) return;
		const onScrollCapture = (e: Event) => {
			const node = e.target;
			if (node instanceof Node && popoverContentRef.current?.contains(node)) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener("scroll", onScrollCapture, true);
		return () => document.removeEventListener("scroll", onScrollCapture, true);
	}, [open]);

	const disabledMatchers = React.useMemo(():
		| Matcher
		| Matcher[]
		| undefined => {
		const matchers: Matcher[] = [];
		const minD = min ? isoStringToDate(min) : undefined;
		const maxD = max ? isoStringToDate(max) : undefined;
		if (minD) matchers.push({ before: minD });
		if (maxD) matchers.push({ after: maxD });
		return matchers.length ? matchers : undefined;
	}, [min, max]);

	const handleSelect = (d: Date | undefined) => {
		if (!d) return;
		onChange(dateToIsoString(d));
		setOpen(false);
	};

	return (
		<div className={cn("space-y-2", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={id}
						type="button"
						variant="outline"
						disabled={disabled}
						data-empty={!selected}
						aria-invalid={!!error}
						className={cn(
							"h-10 w-full min-w-0 justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
							error && "border-destructive",
							disabled && "cursor-not-allowed opacity-50",
							inputClassName,
						)}
					>
						{selected ? (
							format(selected, "MM-dd-yyyy")
						) : (
							<span>{placeholder}</span>
						)}
						<CalendarDays className="size-4 shrink-0 opacity-50" aria-hidden />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					ref={popoverContentRef}
					className="w-auto p-0"
					align="start"
				>
					<Calendar
						mode="single"
						selected={selected}
						onSelect={handleSelect}
						defaultMonth={selected}
						disabled={disabledMatchers}
					/>
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
