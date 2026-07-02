import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	INVOICE_MORE_FILTERS_CONTENT,
	INVOICE_PAYMENT_FILTER_OPTIONS,
	TIME_PERIOD_FILTER_OPTIONS,
} from "@/const";
import { cn } from "@/lib/utils";
import type {
	CheckedState,
	InvoiceMoreFiltersDialogProps,
	InvoicePaymentType,
} from "@/types";

const categoryClass = "text-muted-foreground text-sm font-semibold";
const dividerClass = "border-t border-border";

const ALL_PAYMENT_IDS = INVOICE_PAYMENT_FILTER_OPTIONS.map((o) => o.id);

export function InvoiceMoreFiltersDialog({
	open,
	onOpenChange,
	appliedTimePeriodId,
	appliedPaymentTypes,
	onApply,
}: InvoiceMoreFiltersDialogProps) {
	const [timeId, setTimeId] = useState<string | null>(null);
	const [payments, setPayments] = useState<Set<InvoicePaymentType>>(
		() => new Set(),
	);

	useEffect(() => {
		if (open) {
			setTimeId(appliedTimePeriodId);
			setPayments(new Set(appliedPaymentTypes));
		}
	}, [open, appliedTimePeriodId, appliedPaymentTypes]);

	const draftFilterCount = useMemo(() => {
		let n = timeId ? 1 : 0;
		n += payments.size;
		return n;
	}, [timeId, payments]);

	const timeParentChecked: CheckedState = useMemo(() => {
		if (timeId === null) return false;
		if (timeId === "all") return true;
		return "indeterminate";
	}, [timeId]);

	const paymentParentChecked: CheckedState = useMemo(() => {
		if (payments.size === 0) return false;
		if (payments.size === ALL_PAYMENT_IDS.length) return true;
		return "indeterminate";
	}, [payments]);

	const toggleTime = (id: string) => {
		setTimeId((prev) => {
			if (prev === "all") {
				return id;
			}
			if (prev === id) {
				return null;
			}
			return id;
		});
	};

	const togglePayment = (id: InvoicePaymentType) => {
		setPayments((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleTimeParentChange = (checked: CheckedState) => {
		if (checked === true) {
			setTimeId("all");
		} else {
			setTimeId(null);
		}
	};

	const handlePaymentParentChange = (checked: CheckedState) => {
		if (checked === true) {
			setPayments(new Set(ALL_PAYMENT_IDS));
		} else {
			setPayments(new Set());
		}
	};

	const handleClear = () => {
		setTimeId(null);
		setPayments(new Set());
		onApply(null, []);
		onOpenChange(false);
	};

	const handleApply = () => {
		onApply(timeId, [...payments]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-w-md gap-0 overflow-hidden rounded-xl border border-border p-0"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border p-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
						<DialogTitle className="shrink-0 text-left text-base font-semibold text-text-foreground">
							{INVOICE_MORE_FILTERS_CONTENT.title}
						</DialogTitle>
						{draftFilterCount > 0 && (
							<span className="text-sm font-medium text-link">
								({draftFilterCount} applied)
							</span>
						)}
					</div>
					<DialogClose asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="size-8 shrink-0 rounded-lg border-border bg-background p-0 text-icon-secondary hover:bg-muted hover:text-text-foreground"
							aria-label="Close"
							icon={X}
						/>
					</DialogClose>
				</DialogHeader>

				<div className="max-h-[min(60vh,420px)] space-y-0 overflow-y-auto px-5 py-4">
					<section className="space-y-3">
						<div className="flex items-center gap-2">
							<Checkbox
								id="invoice-filter-time-heading"
								checked={timeParentChecked}
								onCheckedChange={handleTimeParentChange}
								className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
								aria-label="Time period filters"
							/>
							<label
								htmlFor="invoice-filter-time-heading"
								className={cn(categoryClass, "cursor-pointer select-none")}
							>
								{INVOICE_MORE_FILTERS_CONTENT.timePeriod}
							</label>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-7">
							{TIME_PERIOD_FILTER_OPTIONS.map((opt) => {
								const timeInputId = `invoice-filter-time-opt-${opt.id}`;
								return (
									<div
										key={opt.id}
										className="flex cursor-pointer items-center gap-2.5"
									>
										<Checkbox
											id={timeInputId}
											checked={timeId === "all" || timeId === opt.id}
											onCheckedChange={() => toggleTime(opt.id)}
											className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
										/>
										<label
											htmlFor={timeInputId}
											className="cursor-pointer text-sm text-text-foreground select-none"
										>
											{opt.label}
										</label>
									</div>
								);
							})}
						</div>
					</section>

					<div className={cn("my-5", dividerClass)} />

					<section className="space-y-3">
						<div className="flex items-center gap-2">
							<Checkbox
								id="invoice-filter-pay-heading"
								checked={paymentParentChecked}
								onCheckedChange={handlePaymentParentChange}
								className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
								aria-label="Payment method filters"
							/>
							<label
								htmlFor="invoice-filter-pay-heading"
								className={cn(categoryClass, "cursor-pointer select-none")}
							>
								{INVOICE_MORE_FILTERS_CONTENT.paymentMethods}
							</label>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-7">
							{INVOICE_PAYMENT_FILTER_OPTIONS.map((opt) => {
								const payInputId = `invoice-filter-pay-opt-${opt.id}`;
								return (
									<div
										key={opt.id}
										className="flex cursor-pointer items-center gap-2.5"
									>
										<Checkbox
											id={payInputId}
											checked={payments.has(opt.id)}
											onCheckedChange={() => togglePayment(opt.id)}
											className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
										/>
										<label
											htmlFor={payInputId}
											className="cursor-pointer text-sm text-text-foreground select-none"
										>
											{opt.label}
										</label>
									</div>
								);
							})}
						</div>
					</section>
				</div>

				<DialogFooter
					className={cn(
						"mt-0 flex-row items-center justify-between gap-3 border-t border-border px-3 py-3 sm:justify-between",
					)}
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleClear}
					>
						{INVOICE_MORE_FILTERS_CONTENT.clearAll}
					</Button>
					<Button type="button" size="sm" onClick={handleApply}>
						{INVOICE_MORE_FILTERS_CONTENT.apply}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
