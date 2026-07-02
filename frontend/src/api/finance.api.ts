import axios from "axios";
import { API_ENDPOINTS, INVOICE_BULK_SEND_LIMITS } from "@/const";
import { apiClient, axiosInstance, isApiError } from "@/lib/apiClient";
import type { InvoiceCompanyOption, InvoiceListApiData } from "@/types";
import { isValidEmailFormat } from "@/utils";

type Envelope<T> = {
	success: boolean;
	message: string;
	data: T;
};

const MAX_INVOICE_ID_LEN = 255;

function validateBulkSendInvoicesInput(
	invoiceIds: unknown,
	additionalEmails: unknown,
):
	| { ok: true; invoiceIds: string[]; additionalEmails: string[] }
	| { ok: false; message: string } {
	if (!Array.isArray(invoiceIds)) {
		return { ok: false, message: "Invoice ids must be an array." };
	}
	if (!Array.isArray(additionalEmails)) {
		return { ok: false, message: "Additional emails must be an array." };
	}

	const ids = [
		...new Set(
			invoiceIds
				.filter((x): x is string => typeof x === "string")
				.map((id) => id.trim())
				.filter((id) => id.length > 0),
		),
	];
	if (ids.length === 0) {
		return { ok: false, message: "At least one invoice id is required." };
	}
	if (ids.length > INVOICE_BULK_SEND_LIMITS.maxInvoices) {
		return {
			ok: false,
			message: `At most ${INVOICE_BULK_SEND_LIMITS.maxInvoices} invoices per request.`,
		};
	}
	for (const id of ids) {
		if (id.length > MAX_INVOICE_ID_LEN) {
			return {
				ok: false,
				message: "Invoice id is too long.",
			};
		}
	}

	const emailsRaw = additionalEmails.filter(
		(x): x is string => typeof x === "string",
	);
	if (emailsRaw.length > INVOICE_BULK_SEND_LIMITS.maxExtraEmails) {
		return {
			ok: false,
			message: `At most ${INVOICE_BULK_SEND_LIMITS.maxExtraEmails} additional emails.`,
		};
	}
	const emails = [
		...new Set(
			emailsRaw.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0),
		),
	];
	for (const e of emails) {
		if (!isValidEmailFormat(e)) {
			return {
				ok: false,
				message: `Invalid email address: ${e}`,
			};
		}
	}

	return { ok: true, invoiceIds: ids, additionalEmails: emails };
}

export type ListInvoicesParams = {
	limit: number;
	status: string;
	companyId?: string;
	startingAfter?: string;
	searchPage?: string;
	searchOffset?: number;
	/** Inclusive lower bound for invoice `created` (Unix seconds). */
	createdGte?: number;
	/** Inclusive upper bound for invoice `created` (Unix seconds). */
	createdLte?: number;
	/** Comma-separated: ACH, CC */
	paymentMethods?: string;
	/** Case-insensitive match on invoice number or company legal name. */
	search?: string;
};

export async function fetchInvoices(
	params: ListInvoicesParams,
): Promise<
	| { ok: true; data: InvoiceListApiData; status: number }
	| { ok: false; message: string; status: number }
> {
	const searchParams = new URLSearchParams();
	searchParams.set("limit", String(params.limit));
	searchParams.set("status", params.status);
	if (params.companyId) searchParams.set("companyId", params.companyId);
	if (params.startingAfter)
		searchParams.set("startingAfter", params.startingAfter);
	if (params.searchPage) searchParams.set("searchPage", params.searchPage);
	if (params.searchOffset != null)
		searchParams.set("searchOffset", String(params.searchOffset));
	if (params.createdGte != null)
		searchParams.set("createdGte", String(params.createdGte));
	if (params.createdLte != null)
		searchParams.set("createdLte", String(params.createdLte));
	if (params.paymentMethods?.trim())
		searchParams.set("paymentMethods", params.paymentMethods.trim());
	if (params.search?.trim()) searchParams.set("search", params.search.trim());

	const qs = searchParams.toString();
	const path = `${API_ENDPOINTS.finance.invoices}${qs ? `?${qs}` : ""}`;
	const result = await apiClient.get<Envelope<InvoiceListApiData>>(path);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, data: inner, status: result.status };
}

export async function sendInvoiceEmail(
	invoiceId: string,
): Promise<
	{ ok: true; status: number } | { ok: false; message: string; status: number }
> {
	const path = API_ENDPOINTS.finance.invoiceSend(invoiceId);
	const result = await apiClient.post<Envelope<{ sent: true }>>(path);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, status: result.status };
}

export async function bulkSendInvoices(
	invoiceIds: string[],
	additionalEmails: string[],
): Promise<
	{ ok: true; status: number } | { ok: false; message: string; status: number }
> {
	const validated = validateBulkSendInvoicesInput(invoiceIds, additionalEmails);
	if (!validated.ok) {
		return { ok: false, message: validated.message, status: 400 };
	}

	const path = API_ENDPOINTS.finance.bulkSendInvoices;
	const result = await apiClient.post<Envelope<{ sent: true }>>(path, {
		invoiceIds: validated.invoiceIds,
		additionalEmails: validated.additionalEmails,
	});
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined || inner.sent !== true) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, status: result.status };
}

/**
 * Fetches invoice PDF bytes via our API (avoids Stripe blocking iframe embeds).
 */
export async function fetchInvoicePdfBlob(
	invoiceId: string,
): Promise<
	{ ok: true; blob: Blob } | { ok: false; message: string; status: number }
> {
	const path = API_ENDPOINTS.finance.invoicePdf(invoiceId);
	try {
		const response = await axiosInstance.get<Blob>(path, {
			responseType: "blob",
		});
		const ct = String(response.headers["content-type"] ?? "");
		if (ct.includes("application/json")) {
			const text = await response.data.text();
			let msg = "Failed to load PDF";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: response.status };
		}
		return { ok: true, blob: response.data };
	} catch (e) {
		if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
			const text = await e.response.data.text();
			let msg = "Failed to load PDF";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: e.response.status };
		}
		if (axios.isAxiosError(e)) {
			return {
				ok: false,
				message: e.message ?? "Failed to load PDF",
				status: e.response?.status ?? 0,
			};
		}
		return { ok: false, message: "Failed to load PDF", status: 0 };
	}
}

export function downloadInvoicePdfBlob(blob: Blob, displayId: string): void {
	const safe = displayId.replace(/[^\w.-]+/g, "_");
	downloadBlobAsFile(blob, `invoice-${safe}.pdf`);
}

export function downloadBlobAsFile(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.rel = "noopener";
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * POST bulk download: ZIP of invoice PDFs for the given Stripe invoice ids.
 */
export async function bulkDownloadInvoicesZip(
	invoiceIds: string[],
): Promise<
	{ ok: true; blob: Blob } | { ok: false; message: string; status: number }
> {
	const path = API_ENDPOINTS.finance.bulkDownloadInvoices;
	try {
		const response = await axiosInstance.post<Blob>(
			path,
			{ invoiceIds },
			{ responseType: "blob" },
		);
		const ct = String(response.headers["content-type"] ?? "");
		if (ct.includes("application/json")) {
			const text = await response.data.text();
			let msg = "Failed to download invoices";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: response.status };
		}
		return { ok: true, blob: response.data };
	} catch (e) {
		if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
			const text = await e.response.data.text();
			let msg = "Failed to download invoices";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: e.response.status };
		}
		if (axios.isAxiosError(e)) {
			return {
				ok: false,
				message: e.message ?? "Failed to download invoices",
				status: e.response?.status ?? 0,
			};
		}
		return { ok: false, message: "Failed to download invoices", status: 0 };
	}
}

export async function fetchInvoiceCompanyOptions(): Promise<
	| { ok: true; data: InvoiceCompanyOption[]; status: number }
	| { ok: false; message: string; status: number }
> {
	const result = await apiClient.get<Envelope<InvoiceCompanyOption[]>>(
		API_ENDPOINTS.finance.invoiceCompanyOptions,
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, data: inner, status: result.status };
}
