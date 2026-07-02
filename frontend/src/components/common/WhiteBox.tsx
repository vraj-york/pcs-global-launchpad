import type React from "react";
import { cn } from "@/lib/utils";

interface WhiteBoxProps {
	children: React.ReactNode;
	className?: string;
	padding?: "sm" | "md" | "lg" | "xl";
	hasBorder?: boolean;
}
const WhiteBox: React.FC<WhiteBoxProps> = ({
	children,
	className,
	padding = "md",
	hasBorder = true,
}) => {
	const paddingClasses = {
		sm: "p-4",
		md: "p-6",
		lg: "p-8",
		xl: "p-10",
	};

	return (
		<div
			className={cn(
				"bg-background w-full rounded-lg",
				paddingClasses[padding],
				className,
				hasBorder ? "border border-border" : "",
			)}
		>
			{children}
		</div>
	);
};
export { WhiteBox };
