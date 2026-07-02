import type { PromoCodeListItemData } from "./promo-codes-api.types";

export type PromoCodesManagementColumnOptions = {
	allOnPageSelected: boolean;
	someOnPageSelected: boolean;
	onToggleAllPage: (checked: boolean) => void;
	onToggleRow: (id: string, checked: boolean) => void;
	selectedIds: Set<string>;
	onActivation: (row: PromoCodeListItemData, active: boolean) => void;
	activationRowId: string | null;
	onRequestDelete: (row: PromoCodeListItemData) => void;
};

export type PromoCodePromotionEnableWarningProps = {
	title: string;
	body: string;
	className?: string;
};
