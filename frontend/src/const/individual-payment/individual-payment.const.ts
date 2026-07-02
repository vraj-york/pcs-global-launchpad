export const INDIVIDUAL_PAYMENT_STATUS = {
	pending: "pending",
	paid: "paid",
} as const;

export const INDIVIDUAL_PAYMENT_PAGE_CONTENT = {
	discardButton: "Discard",
	proceedToPaymentButton: "Proceed to Payment",
	planInfoLabel: "Plan Info.",
	promoCodeLabel: "Promo Code",
	billingCurrencyLabel: "Billing Currency",
	checkoutDisabled: "Checkout is not available for this account.",
	checkoutError: "Unable to start checkout. Please try again.",
	loadError: "Unable to load payment details. Please refresh and try again.",
	paymentNoteTitle: "Payment",
	paymentNoteBody:
		"Complete payment to activate your assessment access. You can retry if checkout is cancelled.",
	versionLabel: "Version 1.0",
	footerLegal: "Privacy Policy  |  Terms of Use",
} as const;
