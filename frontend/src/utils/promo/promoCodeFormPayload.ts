import type { CreatePromoCodeFormValues } from "@/schemas";
import type { CreatePromoCodePayload, UpdatePromoCodePayload } from "@/types";

export function buildCreatePromoPayload(
	values: CreatePromoCodeFormValues,
): CreatePromoCodePayload {
	const expiresRaw = values.expiresAt?.trim();
	const maxRaw = values.maxRedemptions?.trim();
	const limit = Boolean(values.limitToAssignment);

	const base: CreatePromoCodePayload = {
		code: values.code.trim(),
		planTypeId: values.planTypeId as "monthly" | "annual" | "one_time",
		...(values.description?.trim()
			? { description: values.description.trim() }
			: {}),
		discountType: values.discountType,
		discountValue: Number.parseFloat(values.discountValue),
		duration: values.duration,
		...(expiresRaw ? { expiresAt: expiresRaw } : {}),
		...(maxRaw ? { maxRedemptions: Number.parseInt(maxRaw, 10) } : {}),
	};

	if (!limit) {
		return base;
	}

	return {
		...base,
		limitToAssignment: true,
		...(values.corporationId?.trim()
			? { corporationId: values.corporationId.trim() }
			: {}),
		...(values.companyId?.trim() ? { companyId: values.companyId.trim() } : {}),
	};
}

export function buildUpdatePayloadFromForm(
	values: CreatePromoCodeFormValues,
): UpdatePromoCodePayload {
	const expiresRaw = values.expiresAt?.trim();
	const maxRaw = values.maxRedemptions?.trim();
	const limit = Boolean(values.limitToAssignment);

	const base: UpdatePromoCodePayload = {
		code: values.code.trim(),
		planTypeId: values.planTypeId as "monthly" | "annual" | "one_time",
		...(values.description?.trim()
			? { description: values.description.trim() }
			: {}),
		discountType: values.discountType,
		discountValue: Number.parseFloat(values.discountValue),
		duration: values.duration,
		...(expiresRaw ? { expiresAt: expiresRaw } : {}),
		...(maxRaw ? { maxRedemptions: Number.parseInt(maxRaw, 10) } : {}),
	};

	if (!limit) {
		return {
			...base,
			limitToAssignment: false,
		};
	}

	return {
		...base,
		limitToAssignment: true,
		...(values.corporationId?.trim()
			? { corporationId: values.corporationId.trim() }
			: {}),
		...(values.companyId?.trim() ? { companyId: values.companyId.trim() } : {}),
	};
}

export function createPromoCodePayloadSnapshot(
	values: CreatePromoCodeFormValues,
): string {
	return JSON.stringify(buildCreatePromoPayload(values));
}

export function updatePromoCodePayloadSnapshot(
	values: CreatePromoCodeFormValues,
): string {
	return JSON.stringify(buildUpdatePayloadFromForm(values));
}
