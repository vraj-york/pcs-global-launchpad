import type { ReactNode } from "react";
import type {
	FieldErrors,
	UseFormRegister,
	UseFormSetValue,
	UseFormWatch,
} from "react-hook-form";
import type { CreatePromoCodeFormValues } from "@/schemas";
import type {
	ActiveCompanyListItem,
	CorporationListOption,
	PricingPlanType,
} from "@/types";

export type PromoCodeFormCollapsibleSectionProps = {
	title: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
};

export type PromoCodeFormValidationFooterProps = {
	serverValidated: boolean;
	validationSuccessTitle: string;
	validationSuccessBody: string;
	validationBannerTitle: string;
	validationBannerBody: string;
	validateCta: string;
	onValidate: () => void;
	cancelLabel: string;
	onCancel: () => void;
	submitDisabled: boolean;
	submitTitleHint?: string;
	submitIdleLabel: string;
	isSubmitting: boolean;
	submittingLabel: string;
};

export type PromoCodeFormInfoFieldsProps = {
	register: UseFormRegister<CreatePromoCodeFormValues>;
	errors: FieldErrors<CreatePromoCodeFormValues>;
	setValue: UseFormSetValue<CreatePromoCodeFormValues>;
	watch: UseFormWatch<CreatePromoCodeFormValues>;
	planTypes: PricingPlanType[];
	plansLoading: boolean;
	discountType: "percent" | "fixed_amount";
	duration: "once" | "forever";
	minExpiryDate: string;
	scheduleLocked: boolean;
	scheduleLockedHint: string;
};

export type PromoCodeFormAssignmentFieldsProps = {
	errors: FieldErrors<CreatePromoCodeFormValues>;
	setValue: UseFormSetValue<CreatePromoCodeFormValues>;
	watch: UseFormWatch<CreatePromoCodeFormValues>;
	corporations: CorporationListOption[];
	corpsLoading: boolean;
	activeCompaniesLoading: boolean;
	companyChoices: ActiveCompanyListItem[];
	limitToAssignment: boolean;
	corporationId: string | undefined;
};
