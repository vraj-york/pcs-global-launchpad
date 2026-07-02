import { Download, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadInvoicePdfBlob } from "@/api";
import { AppLoader, PdfViewer } from "@/components";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { INVOICE_DETAILS_MODAL } from "@/const";
import { cn } from "@/lib/utils";
import { useInvoiceManagementStore } from "@/store";
import type { InvoiceDetailsModalProps } from "@/types";

export function InvoiceDetailsModal({
	open,
	onOpenChange,
	invoice,
	onSend,
	sendPending,
	permissions,
}: InvoiceDetailsModalProps) {
	const canSend = permissions?.canSendIndividual ?? true;
	const canDownload = permissions?.canDownload ?? true;
	const fetchInvoicePdf = useInvoiceManagementStore((s) => s.fetchInvoicePdf);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [pdfError, setPdfError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			setPdfBlob(null);
			setPdfError(null);
			setPdfLoading(false);
			return;
		}
		if (!invoice?.id) {
			return;
		}

		let cancelled = false;

		(async () => {
			setPdfBlob(null);
			setPdfError(null);
			setPdfLoading(true);

			const res = await fetchInvoicePdf(invoice.id);
			if (cancelled) return;

			if (!res.ok) {
				setPdfLoading(false);
				setPdfError(res.message);
				return;
			}

			setPdfBlob(res.blob);
			setPdfLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, [open, invoice?.id, fetchInvoicePdf]);

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setPdfBlob(null);
			setPdfError(null);
			setPdfLoading(false);
		}
		onOpenChange(next);
	};

	const handleDownloadClick = () => {
		if (!invoice || !pdfBlob) return;
		downloadInvoicePdfBlob(pdfBlob, invoice.displayId);
	};

	const previewFrameClass =
		"box-border flex w-[672px] max-w-full flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0 " +
		"h-[783px] max-h-[min(783px,calc(100vh-14rem))]";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="flex max-h-[min(95vh,980px)] w-[min(100vw-2rem,720px)] max-w-[min(100vw-2rem,720px)] flex-col gap-0 p-0 sm:max-w-[min(100vw-2rem,720px)]"
				showCloseButton
			>
				<div className="border-b border-border px-6 pt-6 pb-4">
					<DialogHeader className="gap-1">
						<DialogTitle>{INVOICE_DETAILS_MODAL.title}</DialogTitle>
						<DialogDescription>
							{INVOICE_DETAILS_MODAL.description}
						</DialogDescription>
					</DialogHeader>
				</div>
				<div className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/30 p-0">
					{pdfLoading ? (
						<AppLoader
							showMessage
							className={cn(previewFrameClass, "items-center justify-center")}
						/>
					) : pdfError ? (
						<div
							className={cn(
								previewFrameClass,
								"items-center justify-center text-center",
							)}
						>
							<p className="text-small text-destructive px-4">{pdfError}</p>
						</div>
					) : pdfBlob ? (
						<div className={previewFrameClass}>
							<PdfViewer file={pdfBlob} className="size-full flex-1" />
						</div>
					) : (
						<div
							className={cn(
								previewFrameClass,
								"items-center justify-center text-center",
							)}
						>
							<p className="text-small text-muted-foreground px-4">
								{INVOICE_DETAILS_MODAL.noPdf}
							</p>
						</div>
					)}
				</div>
				<DialogFooter className="border-t border-border px-6 py-4 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
					>
						{INVOICE_DETAILS_MODAL.cancel}
					</Button>
					{canSend ? (
						<Button
							type="button"
							variant="secondary"
							isLoading={sendPending}
							icon={Send}
							onClick={() => void onSend()}
						>
							{INVOICE_DETAILS_MODAL.sendInvoice}
						</Button>
					) : null}
					{canDownload ? (
						<Button
							type="button"
							variant="default"
							disabled={!pdfBlob}
							icon={Download}
							onClick={handleDownloadClick}
						>
							{INVOICE_DETAILS_MODAL.downloadInvoice}
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
