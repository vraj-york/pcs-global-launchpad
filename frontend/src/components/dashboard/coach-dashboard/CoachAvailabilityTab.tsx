// Figma layer: "Settings - Availability" — node 4:21894
/*
 * SEMANTIC ANALYSIS
 * Coach Settings → Availability tab.
 * - Two summary cards: Time zone preference (globe) + Default session length (hourglass)
 * - Weekly editor: one row per day (Mon–Sun) with:
 *   - Switch toggle + day label
 *   - One or more start/end time ranges (Input + clock icon), each removable (X)
 *   - "+ Add" to append a range (disabled when the day is off → "Unavailable")
 * - Footer: Cancel (outline) + Save & Update (primary), enabled when dirty
 */
import { Clock, Globe, Hourglass, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	COACH_AVAILABILITY_DEFAULT_RANGE,
	COACH_AVAILABILITY_SETTINGS,
	type CoachAvailabilitySettingsDay,
} from "@/const";
import { cn } from "@/lib/utils";

const A = COACH_AVAILABILITY_SETTINGS;

function cloneDays(): CoachAvailabilitySettingsDay[] {
	return A.days.map((day) => ({
		...day,
		ranges: day.ranges.map((range) => ({ ...range })),
	}));
}

function InfoCard({
	icon: Icon,
	iconWrapClassName,
	iconClassName,
	title,
	subtitle,
}: {
	icon: typeof Globe;
	iconWrapClassName: string;
	iconClassName: string;
	title: string;
	subtitle: string;
}) {
	return (
		<div className="flex flex-1 items-center gap-4 rounded-2xl border border-border bg-background p-6">
			<div
				className={cn(
					"flex size-14 shrink-0 items-center justify-center rounded-[11.2px]",
					iconWrapClassName,
				)}
			>
				<Icon className={cn("size-[33.6px]", iconClassName)} aria-hidden />
			</div>
			<div className="flex flex-col gap-1.5">
				<p className="text-heading-4 font-semibold text-text-foreground">
					{title}
				</p>
				<p className="text-small text-text-secondary">{subtitle}</p>
			</div>
		</div>
	);
}

function TimeCell({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="relative flex-1">
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="pr-9"
			/>
			<Clock
				className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden
			/>
		</div>
	);
}

export function CoachAvailabilityTab() {
	const initialDays = useMemo(cloneDays, []);
	const [days, setDays] = useState<CoachAvailabilitySettingsDay[]>(cloneDays);
	const [saving, setSaving] = useState(false);

	const isDirty = useMemo(
		() => JSON.stringify(days) !== JSON.stringify(initialDays),
		[days, initialDays],
	);

	const mutateDay = (
		id: string,
		updater: (day: CoachAvailabilitySettingsDay) => CoachAvailabilitySettingsDay,
	) => {
		setDays((prev) => prev.map((day) => (day.id === id ? updater(day) : day)));
	};

	const toggleDay = (id: string) => {
		mutateDay(id, (day) => {
			const enabled = !day.enabled;
			return {
				...day,
				enabled,
				ranges:
					enabled && day.ranges.length === 0
						? [{ ...COACH_AVAILABILITY_DEFAULT_RANGE }]
						: day.ranges,
			};
		});
	};

	const addRange = (id: string) => {
		mutateDay(id, (day) => ({
			...day,
			ranges: [...day.ranges, { ...COACH_AVAILABILITY_DEFAULT_RANGE }],
		}));
	};

	const removeRange = (id: string, index: number) => {
		mutateDay(id, (day) => {
			const ranges = day.ranges.filter((_, i) => i !== index);
			return { ...day, ranges, enabled: ranges.length > 0 };
		});
	};

	const updateRange = (
		id: string,
		index: number,
		field: "start" | "end",
		value: string,
	) => {
		mutateDay(id, (day) => ({
			...day,
			ranges: day.ranges.map((range, i) =>
				i === index ? { ...range, [field]: value } : range,
			),
		}));
	};

	const handleCancel = () => setDays(cloneDays());

	const handleSave = () => {
		setSaving(true);
		// Placeholder async action until the coach availability API is wired up.
		setTimeout(() => {
			setSaving(false);
			toast.success("Availability updated successfully.");
		}, 1000);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Summary cards */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<InfoCard
					icon={Globe}
					iconWrapClassName="bg-info-bg"
					iconClassName="text-icon-info"
					title={A.timezoneCard.title}
					subtitle={A.timezoneCard.subtitle}
				/>
				<InfoCard
					icon={Hourglass}
					iconWrapClassName="bg-success-bg"
					iconClassName="text-icon-success"
					title={A.sessionCard.title}
					subtitle={A.sessionCard.subtitle}
				/>
			</div>

			{/* Weekly editor */}
			<div className="rounded-xl border border-border bg-background">
				<div className="flex flex-col gap-4 px-6 pt-6">
					{days.map((day) => (
						<div
							key={day.id}
							className="flex items-start justify-between gap-4 border-b border-border pb-6 last:border-b-0"
						>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-16">
								<div className="flex h-9 w-[108px] items-center gap-2">
									<Switch
										checked={day.enabled}
										onCheckedChange={() => toggleDay(day.id)}
										aria-label={`${A.toggleDayLabel} ${day.label}`}
									/>
									<span className="text-small font-semibold text-text-foreground">
										{day.label}
									</span>
								</div>

								{day.enabled && day.ranges.length > 0 ? (
									<div className="flex flex-col gap-3">
										{day.ranges.map((range, index) => (
											<div
												key={index}
												className="flex w-full items-center gap-4 sm:w-[400px]"
											>
												<TimeCell
													value={range.start}
													onChange={(value) =>
														updateRange(day.id, index, "start", value)
													}
												/>
												<span
													className="h-px w-8 shrink-0 bg-border"
													aria-hidden
												/>
												<TimeCell
													value={range.end}
													onChange={(value) =>
														updateRange(day.id, index, "end", value)
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													icon={X}
													aria-label={A.removeRangeLabel}
													onClick={() => removeRange(day.id, index)}
													className="shrink-0"
												/>
											</div>
										))}
									</div>
								) : (
									<div className="flex h-9 items-center">
										<span className="text-small text-text-secondary">
											{A.unavailable}
										</span>
									</div>
								)}
							</div>

							<Button
								type="button"
								variant="ghost"
								icon={Plus}
								disabled={!day.enabled}
								onClick={() => addRange(day.id)}
								className={cn(
									"shrink-0",
									day.enabled
										? "bg-info-bg text-interactive-info hover:bg-info-bg/80"
										: "bg-secondary text-muted-foreground",
								)}
							>
								{A.add}
							</Button>
						</div>
					))}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
					<Button
						type="button"
						variant="outline"
						disabled={saving || !isDirty}
						onClick={handleCancel}
					>
						{A.cancel}
					</Button>
					<Button
						type="button"
						disabled={saving || !isDirty}
						onClick={handleSave}
					>
						{saving ? A.saving : A.save}
					</Button>
				</div>
			</div>
		</div>
	);
}
