import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AddPromoCodeFormShellProps = {
	children: ReactNode;
	className?: string;
};

export function AddPromoCodeFormShell({
	children,
	className,
}: AddPromoCodeFormShellProps) {
	return (
		<div
			className={cn(
				"w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm",
				className,
			)}
		>
			{children}
		</div>
	);
}
