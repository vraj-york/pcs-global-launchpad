export type DecreaseStressContentKey =
	| "ba150"
	| "bb150"
	| "oa150"
	| "p17812"
	| "p81217"
	| "sameregion";

export type DecreaseStressPrimaryKey = "ba150" | "bb150" | "oa150";

export type DecreaseStressSecondaryKey = "p17812" | "p81217" | "sameregion";

export type { DecreaseStressScoreMetrics } from "./assessment-user-styles.types";

export type DecreaseStressPrimaryCardContent = {
	key: DecreaseStressPrimaryKey;
	title: string | null;
	lead: string | null;
	body: string;
};

export type DecreaseStressSecondaryCardContent = {
	key: DecreaseStressSecondaryKey;
	boldPhrase: string;
	prefix: string;
	suffix: string;
};

export type StressManagementResolvedContent = {
	primary: DecreaseStressPrimaryCardContent;
	secondary: DecreaseStressSecondaryCardContent;
};

export type StressManagementProps = {
	decreaseStressContent: Record<string, unknown>;
	variant?: "default" | "print";
};

export type DecreaseStressPrimaryCardProps = {
	content: DecreaseStressPrimaryCardContent;
	panelClassName?: string;
	iconWrapperClassName?: string;
	iconClassName?: string;
	textClassName?: string;
	titleClassName?: string;
	leadClassName?: string;
	bodyClassName?: string;
	useCompactPadding?: boolean;
};

export type DecreaseStressSecondaryCardProps = {
	content: DecreaseStressSecondaryCardContent;
	className?: string;
	targetClassName?: string;
	textClassName?: string;
	useCompactPadding?: boolean;
};

export type StressedStepsTextPart = {
	text: string;
	bold: boolean;
};

export type StressedStepsListItem = {
	parts: StressedStepsTextPart[];
};

export type DecreaseStressStressedStepsCardProps = {
	items: StressedStepsListItem[];
	panelClassName?: string;
	titleClassName?: string;
	innerPanelClassName?: string;
	listClassName?: string;
	useCompactPadding?: boolean;
};
