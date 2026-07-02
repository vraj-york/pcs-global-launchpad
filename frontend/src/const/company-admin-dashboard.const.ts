import { PLAN_PRICE_BREAKDOWN_CARD_LABELS } from "./common/plan-price-breakdown.const";

/** Mirrors backend `MIN/MAX_ONE_TIME_ASSESSMENT_QUANTITY`. */
export const ONE_TIME_ASSESSMENT_QUANTITY = {
	min: 1,
	max: 500,
} as const;

/** Company admin post-invite review (before Stripe checkout). */
export const COMPANY_ADMIN_ONBOARDING = {
	step1Title: "Basic Details",
	step1Subtitle: "Review the details below to proceed with payment.",
	step2TitlePrefix: "",
	corporationSection: "Corporation Info.",
	companySection: "Company Info.",
	labels: {
		parentCorporationLegalName: "Parent Corporation Legal Name",
		ownershipType: "Ownership Type",
		companyLegalName: "Company Legal Name",
		dbaTradeName: "DBA/ Trade Name",
		websiteUrl: "Website URL",
		companyType: "Company Type",
		officeType: "Office Type",
		regionDataResidency: "Region (Data Residency)",
		industry: "Industry",
		companyPhone: "Company Phone No.",
		companyAddress: "Company Address",
	},
	back: "Back",
	proceedToPlan: "Proceed to Plan Details",
	step2IntroMonthly:
		"A monthly subscription plan providing ongoing access to the BSPBlueprint platform and its core tools.",
	step2IntroAnnual:
		"An annual subscription plan providing ongoing access to the BSPBlueprint platform and its core tools.",
	step2IntroOneTime:
		"An individual subscription plan allowing companies to run BSP assessments with as per their need.",
	planInfoSection: "Plan Info.",
	assessmentPricingSection: "Assessment & Price Calculations",
	labelsOneTime: {
		noOfAssessments: "No. of Assessment",
		pricePerAssessment: "Price per Assessment",
		invoiceAmount: "Invoice Amount",
	},
	assessmentQuantityMin: ONE_TIME_ASSESSMENT_QUANTITY.min,
	assessmentQuantityMax: ONE_TIME_ASSESSMENT_QUANTITY.max,
	assessmentQuantityInvalid: `Enter a valid assessment quantity between ${ONE_TIME_ASSESSMENT_QUANTITY.min} and ${ONE_TIME_ASSESSMENT_QUANTITY.max}.`,
	paymentNoteBodyOneTime:
		"Once your payment is complete, you'll be redirected to the company overview for more info.",
	trialSection: "Trial Info.",
	planSection: "Plan & Pricing Calculations",
	labelsPlan: {
		zeroTrial: "Zero Trial",
		trialLength: "Trial Length",
		trialStart: "Trial Start Date",
		trialEnd: "Trial End Date",
		autoConvert: "Auto-convert Trial",
		promoCode: "Promo Code",
		planLevel: "Plan Level",
		...PLAN_PRICE_BREAKDOWN_CARD_LABELS,
		billingCurrency: "Billing Currency",
		on: "On",
		off: "Off",
		default: "(Default)",
	},
	paymentNoteTitle: "Note",
	paymentNoteBody:
		"Once your payment is complete, you'll be redirected to the dashboard.",
	paymentNoteBodyMonthlyChargeNow:
		"Checkout collects payment now for your monthly plan (zero trial). After payment, you'll return to the dashboard.",
	paymentNoteBodyMonthlyTrial:
		"The subscription is created in trialing until your trial end date. Recurring plan fees, the implementation fee, and onsite training (if selected) are billed together on the first subscription invoice after the trial. When checkout completes, you'll return to the dashboard.",
	proceedToPayment: "Proceed to Payment",
	viewCompanyDetails: "View Details",
	proceeding: "Opening checkout…",
	noPlanTitle: "Plan not configured",
	noPlanBody:
		"This company does not have a plan assigned yet. Contact support if you need help.",
	checkoutDisabled:
		"Checkout is not available yet. Ensure a plan with billing is assigned, or contact support.",
	multiCompanyTitle: "Your Companies",
	multiCompanySubtitle:
		"Review the companies below & complete any required payments to activate their subscriptions.",
	backToCompanies: "Back to companies",
	colCompany: "Company Name",
	colCorporation: "Parent Corporation",
	colStatus: "Payment Status",
	colAction: "Actions",
	statusPaid: "Paid",
	statusPaymentDue: "Payment Due",
	statusPending: "Pending setup",
	notProvided: "N/A",
} as const;

export const COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES = {
	paid: "paid",
	paymentDue: "payment_due",
	pending: "pending",
} as const;

export const COMPANY_ADMIN_ONBOARDING_GATE = {
	loadError:
		"We couldn't load your dashboard. Please refresh or try again later.",
	emptyCompanies: "No companies are linked to this account.",
} as const;
