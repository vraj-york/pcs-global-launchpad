export type IndividualPaymentApiEnvelope<T> = {
	success: boolean;
	message: string;
	data?: T;
};

export type IndividualPaymentPricing = {
	planPrice: string;
	discount: string;
	invoiceAmount: string;
	billingCurrency: string;
	promoCode: string | null;
};

export type IndividualPaymentPlanSummary = {
	planTypeId: string;
	planTypeName: string;
	pricing: IndividualPaymentPricing;
};

export type IndividualPaymentReview = {
	title: string;
	subtitle: string;
	hasPaid: boolean;
	canCheckout: boolean;
	planSummary: IndividualPaymentPlanSummary | null;
};
