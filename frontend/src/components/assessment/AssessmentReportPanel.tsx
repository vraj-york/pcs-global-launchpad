import { cn } from "@/lib/utils";
import type { AssessmentReportPanelProps } from "@/types";

const VARIANT_CLASS_NAMES = {
	bordered: "rounded-2xl border border-border bg-background",
	filled: "rounded-2xl bg-card",
	info: "rounded-2xl bg-info-bg",
	warning: "rounded-2xl border border-warning bg-background",
} as const;

const PADDING_CLASS_NAMES = {
	none: "",
	sm: "p-4",
	md: "p-6",
	lg: "p-8",
	xl: "p-16",
} as const;

export function AssessmentReportPanel({
	as: Component = "div",
	variant = "bordered",
	padding = "none",
	className,
	children,
	...rest
}: AssessmentReportPanelProps) {
	const paddingClassName =
		padding === "none" ? undefined : PADDING_CLASS_NAMES[padding];

	return (
		<Component
			className={cn(
				VARIANT_CLASS_NAMES[variant],
				paddingClassName,
				"print:[print-color-adjust:exact]",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}
