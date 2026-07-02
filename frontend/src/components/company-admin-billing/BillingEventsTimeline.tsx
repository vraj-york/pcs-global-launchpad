import { Download, Loader2, RotateCw } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	BILLING_HISTORY_EVENT_TYPE_LABELS,
	COMPANY_ADMIN_BILLING_EVENT_COPY,
	COMPANY_ADMIN_BILLING_EVENT_MARKER_TONE,
	COMPANY_ADMIN_BILLING_EVENT_TITLE_CLASS,
	COMPANY_ADMIN_BILLING_PAGE_CONTENT,
	COMPANY_ADMIN_BILLING_TIMELINE_MARKER_INNER_CLASS,
	COMPANY_ADMIN_BILLING_TIMELINE_MARKER_RING_CLASS,
	type CompanyAdminBillingTimelineMarkerTone,
} from "@/const";
import { cn } from "@/lib/utils";
import type {
	BillingEventsTimelineProps,
	BillingHistoryEventType,
	BillingHistoryRow,
} from "@/types";
import { formatMoneyFromMinorUnits, formatOccurredAtSeconds } from "@/utils";

function BillingTimelineMarker({
	eventType,
}: {
	eventType: BillingHistoryEventType;
}) {
	const tone: CompanyAdminBillingTimelineMarkerTone =
		COMPANY_ADMIN_BILLING_EVENT_MARKER_TONE[eventType] ?? "info";
	const ringClass = COMPANY_ADMIN_BILLING_TIMELINE_MARKER_RING_CLASS[tone];
	const innerClass = COMPANY_ADMIN_BILLING_TIMELINE_MARKER_INNER_CLASS[tone];

	return (
		<span
			className={cn(
				"flex size-6 shrink-0 items-center justify-center rounded-full border bg-background",
				ringClass,
			)}
			aria-hidden
		>
			<span className={cn("size-2.5 rounded-full", innerClass)} />
		</span>
	);
}

function planName(row: BillingHistoryRow): string {
	return (
		row.planLabel?.trim() || COMPANY_ADMIN_BILLING_EVENT_COPY.defaultPlanName
	);
}

function billingEventTitle(eventType: BillingHistoryEventType): string {
	return BILLING_HISTORY_EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function billingEventCardTitle(row: BillingHistoryRow): string | null {
	switch (row.eventType) {
		case "subscription_reinstated":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.cardTitleReinstated;
		case "payment_failed":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.cardTitlePaymentFailed;
		case "payment_successful":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.cardTitlePaymentSuccessful;
		default:
			return null;
	}
}

function billingEventDescription(row: BillingHistoryRow): string {
	const plan = planName(row);
	const amount =
		row.amountCents != null && row.currency
			? formatMoneyFromMinorUnits(row.amountCents, row.currency)
			: null;

	switch (row.eventType) {
		case "subscription_created":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionSubscriptionCreated(
				plan,
			);
		case "invoice_generated":
			return amount
				? COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionInvoiceGeneratedWithAmount(
						amount,
						plan,
					)
				: COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionInvoiceGeneratedNoAmount(
						plan,
					);
		case "payment_successful":
			return amount
				? COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionPaymentSuccessfulWithAmount(
						amount,
						plan,
					)
				: COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionPaymentSuccessfulNoAmount(
						plan,
					);
		case "payment_failed":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionPaymentFailed;
		case "plan_upgraded":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionPlanUpgraded(plan);
		case "subscription_canceled":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionSubscriptionCanceled(
				plan,
			);
		case "subscription_reinstated":
			return COMPANY_ADMIN_BILLING_EVENT_COPY.descriptionSubscriptionReinstated(
				plan,
			);
		default:
			return "";
	}
}

function TimelineEventRow({
	row,
	canRetryPayment,
	invoiceDownloadBusyEventId,
	retryBusy,
	onDownloadInvoice,
	onRetryPayment,
	isLast,
}: {
	row: BillingHistoryRow;
	canRetryPayment: boolean;
	invoiceDownloadBusyEventId: string | null;
	retryBusy: boolean;
	onDownloadInvoice: (invoiceId: string, eventId: string) => void;
	onRetryPayment: () => void;
	isLast: boolean;
}) {
	const titleClass =
		COMPANY_ADMIN_BILLING_EVENT_TITLE_CLASS[row.eventType] ??
		"text-text-foreground";
	const cardTitle = billingEventCardTitle(row);
	const description = billingEventDescription(row);
	const showDownload =
		Boolean(row.stripeInvoiceId) &&
		(row.eventType === "payment_successful" ||
			row.eventType === "invoice_generated");
	const showRetry = row.eventType === "payment_failed";
	const isDownloadBusy = invoiceDownloadBusyEventId === row.eventId;

	const handleDownload = useCallback(() => {
		if (!row.stripeInvoiceId) {
			return;
		}
		void onDownloadInvoice(row.stripeInvoiceId, row.eventId);
	}, [onDownloadInvoice, row.eventId, row.stripeInvoiceId]);

	return (
		<div className="flex items-start gap-2.5">
			<div className="flex w-6 shrink-0 flex-col items-center gap-1.5 self-stretch">
				<BillingTimelineMarker eventType={row.eventType} />
				{!isLast ? (
					<span className="min-h-0 w-px flex-1 bg-border" aria-hidden />
				) : null}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<p className={cn("text-small font-semibold", titleClass)}>
						{billingEventTitle(row.eventType)}
					</p>
					<p className="shrink-0 text-small text-muted-foreground">
						{formatOccurredAtSeconds(row.occurredAt)}
					</p>
				</div>
				<div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						{cardTitle ? (
							<p className="text-small font-medium text-text-foreground">
								{cardTitle}
							</p>
						) : null}
						<p className="text-small text-text-secondary">{description}</p>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						{showDownload ? (
							<Button
								type="button"
								variant="outline"
								icon={Download}
								isLoading={isDownloadBusy}
								onClick={handleDownload}
								tabIndex={0}
								aria-label={COMPANY_ADMIN_BILLING_PAGE_CONTENT.downloadInvoice}
							>
								{COMPANY_ADMIN_BILLING_PAGE_CONTENT.downloadInvoice}
							</Button>
						) : null}
						{showRetry ? (
							<Button
								type="button"
								icon={RotateCw}
								isLoading={retryBusy}
								disabled={!canRetryPayment}
								onClick={onRetryPayment}
								tabIndex={0}
								aria-label={COMPANY_ADMIN_BILLING_PAGE_CONTENT.retryPayment}
							>
								{COMPANY_ADMIN_BILLING_PAGE_CONTENT.retryPayment}
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}

export function BillingEventsTimeline({
	events,
	loading,
	error,
	canRetryPayment,
	invoiceDownloadBusyEventId,
	retryBusy,
	onDownloadInvoice,
	onRetryPayment,
}: BillingEventsTimelineProps) {
	if (loading) {
		return (
			<div
				className="flex min-h-40 items-center justify-center"
				role="status"
				aria-live="polite"
			>
				<Loader2
					className="size-6 animate-spin text-muted-foreground"
					aria-hidden
				/>
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-sm text-destructive" role="alert">
				{error}
			</p>
		);
	}

	if (events.length === 0) {
		return (
			<p className="text-small text-text-secondary">
				{COMPANY_ADMIN_BILLING_PAGE_CONTENT.noEvents}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{events.map((row, index) => (
				<TimelineEventRow
					key={row.eventId}
					row={row}
					canRetryPayment={canRetryPayment}
					invoiceDownloadBusyEventId={invoiceDownloadBusyEventId}
					retryBusy={retryBusy}
					onDownloadInvoice={onDownloadInvoice}
					onRetryPayment={onRetryPayment}
					isLast={index === events.length - 1}
				/>
			))}
		</div>
	);
}
