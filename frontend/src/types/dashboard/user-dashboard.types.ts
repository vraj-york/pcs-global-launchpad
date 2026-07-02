import type { LucideIcon } from "lucide-react";

export type ActionCardProps = {
	icon: LucideIcon;
	iconClassName: string;
	hoverBorderClassName: string;
	title: string;
	description: string;
	className?: string;
	/** Lucide icon pixel size; defaults to top-row dashboard size. Wrapper unchanged. */
	iconSize?: number;
	onClick?: () => void;
	ariaLabel?: string;
};

export type TakeAssessmentCardProps = {
	className?: string;
};

export type PlaceholderCardProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	className?: string;
	/** Wrapper around the icon (light blue-grey rounded square chip). */
	iconWrapperClassName?: string;
	iconClassName?: string;
	iconPixelSize?: number;
	iconStrokeWidth?: number;
};
