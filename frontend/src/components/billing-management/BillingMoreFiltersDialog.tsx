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
	BILLING_CYCLE_FILTER_OPTIONS,
	BILLING_MORE_FILTERS_CONTENT,
	BILLING_PAYMENT_METHOD_FILTER_OPTIONS,
	TIME_PERIOD_FILTER_OPTIONS,
} from "@/const";
import { cn } from "@/lib/utils";
import type {
	BillingCycleFilterId,
	BillingMoreFiltersDialogProps,
	BillingPaymentMethodType,
	BillingTimePeriodId,
	CheckedState,
} from "@/types";

const categoryClass = "text-muted-foreground text-sm font-semibold";
const dividerClass = "border-t border-border";
const ALL_CYCLES = BILLING_CYCLE_FILTER_OPTIONS.map((o) => o.id);
const ALL_PAYMENTS = BILLING_PAYMENT_METHOD_FILTER_OPTIONS.map((o) => o.id);

export function BillingMoreFiltersDialog({
	open,
	onOpenChange,
	appliedBillingCycles,
	appliedTimePeriod,
	appliedPaymentTypes,
	onApply,
}: BillingMoreFiltersDialogProps) {
	const [billingCycles, setBillingCycles] = useState<Set<BillingCycleFilterId>>(
		() => new Set(),
	);
	const [timePeriod, setTimePeriod] = useState<BillingTimePeriodId | null>(
		null,
	);
	const [paymentTypes, setPaymentTypes] = useState<
		Set<Exclude<BillingPaymentMethodType, null>>
	>(() => new Set());

	useEffect(() => {
		if (!open) return;
		setBillingCycles(new Set(appliedBillingCycles));
		setTimePeriod(appliedTimePeriod);
		setPaymentTypes(new Set(appliedPaymentTypes));
	}, [open, appliedBillingCycles, appliedTimePeriod, appliedPaymentTypes]);

	const draftFilterCount = useMemo(() => {
		let n = 0;
		n += billingCycles.size;
		n += paymentTypes.size;
		if (timePeriod) n += 1;
		return n;
	}, [billingCycles, paymentTypes, timePeriod]);

	const billingParentChecked: CheckedState = useMemo(() => {
		if (billingCycles.size === 0) return false;
		if (billingCycles.size === ALL_CYCLES.length) return true;
		return "indeterminate";
	}, [billingCycles]);

	const paymentParentChecked: CheckedState = useMemo(() => {
		if (paymentTypes.size === 0) return false;
		if (paymentTypes.size === ALL_PAYMENTS.length) return true;
		return "indeterminate";
	}, [paymentTypes]);

	const timeParentChecked: CheckedState = useMemo(() => {
		if (timePeriod === null) return false;
		return "indeterminate";
	}, [timePeriod]);

	const handleToggleCycle = (id: BillingCycleFilterId) => {
		setBillingCycles((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleTogglePayment = (id: Exclude<BillingPaymentMethodType, null>) => {
		setPaymentTypes((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleToggleTime = (id: BillingTimePeriodId) => {
		setTimePeriod((prev) => (prev === id ? null : id));
	};

	const handleClear = () => {
		setBillingCycles(new Set());
		setTimePeriod(null);
		setPaymentTypes(new Set());
		onApply({ billingCycles: [], timePeriod: null, paymentTypes: [] });
		onOpenChange(false);
	};

	const handleApply = () => {
		onApply({
			billingCycles: [...billingCycles],
			timePeriod,
			paymentTypes: [...paymentTypes],
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-w-md gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-md"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border p-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
						<DialogTitle className="shrink-0 text-left text-base font-semibold text-text-foreground">
							{BILLING_MORE_FILTERS_CONTENT.title}
						</DialogTitle>
						{draftFilterCount > 0 ? (
							<span className="text-sm font-medium text-link">
								({draftFilterCount} applied)
							</span>
						) : null}
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
								id="billing-cycle-heading"
								checked={billingParentChecked}
								onCheckedChange={(checked) => {
									if (checked === true) {
										setBillingCycles(new Set(ALL_CYCLES));
									} else {
										setBillingCycles(new Set());
									}
								}}
								className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
							/>
							<label
								htmlFor="billing-cycle-heading"
								className={cn(categoryClass, "cursor-pointer select-none")}
							>
								{BILLING_MORE_FILTERS_CONTENT.billingCycle}
							</label>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-7">
							{BILLING_CYCLE_FILTER_OPTIONS.map((opt) => {
								const id = `billing-cycle-${opt.id}`;
								return (
									<div key={opt.id} className="flex items-center gap-2.5">
										<Checkbox
											id={id}
											checked={billingCycles.has(opt.id)}
											onCheckedChange={() => handleToggleCycle(opt.id)}
											className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
										/>
										<label
											htmlFor={id}
											className="cursor-pointer select-none text-sm text-text-foreground"
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
								id="billing-time-heading"
								checked={timeParentChecked}
								onCheckedChange={(checked) => {
									if (checked !== true) {
										setTimePeriod(null);
									}
								}}
								className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
							/>
							<label
								htmlFor="billing-time-heading"
								className={cn(categoryClass, "cursor-pointer select-none")}
							>
								{BILLING_MORE_FILTERS_CONTENT.timePeriod}
							</label>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-7">
							{TIME_PERIOD_FILTER_OPTIONS.map((opt) => {
								const id = `billing-time-${opt.id}`;
								return (
									<div key={opt.id} className="flex items-center gap-2.5">
										<Checkbox
											id={id}
											checked={timePeriod === opt.id}
											onCheckedChange={() => handleToggleTime(opt.id)}
											className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
										/>
										<label
											htmlFor={id}
											className="cursor-pointer select-none text-sm text-text-foreground"
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
								id="billing-payment-heading"
								checked={paymentParentChecked}
								onCheckedChange={(checked) => {
									if (checked === true) {
										setPaymentTypes(new Set(ALL_PAYMENTS));
									} else {
										setPaymentTypes(new Set());
									}
								}}
								className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
							/>
							<label
								htmlFor="billing-payment-heading"
								className={cn(categoryClass, "cursor-pointer select-none")}
							>
								{BILLING_MORE_FILTERS_CONTENT.paymentMethods}
							</label>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-7">
							{BILLING_PAYMENT_METHOD_FILTER_OPTIONS.map((opt) => {
								const id = `billing-payment-${opt.id}`;
								return (
									<div key={opt.id} className="flex items-center gap-2.5">
										<Checkbox
											id={id}
											checked={paymentTypes.has(opt.id)}
											onCheckedChange={() => handleTogglePayment(opt.id)}
											className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
										/>
										<label
											htmlFor={id}
											className="cursor-pointer select-none text-sm text-text-foreground"
										>
											{opt.label}
										</label>
									</div>
								);
							})}
						</div>
					</section>
				</div>

				<DialogFooter className="mt-0 flex-row items-center justify-between gap-3 border-t border-border px-3 py-3 sm:justify-between">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleClear}
					>
						{BILLING_MORE_FILTERS_CONTENT.clearAll}
					</Button>
					<Button type="button" size="sm" onClick={handleApply}>
						{BILLING_MORE_FILTERS_CONTENT.apply}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
