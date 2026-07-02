import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Info } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const bannerVariants = cva("flex w-full flex-col gap-0.5 rounded-lg p-4", {
	variants: {
		variant: {
			default: "bg-info-bg",
			warning: "bg-warning-bg",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

export interface BannerProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
		VariantProps<typeof bannerVariants> {
	title: React.ReactNode;
	icon?: React.ReactNode;
	titleClassName?: string;
	childrenClassName?: string;
}

function Banner({
	className,
	variant = "default",
	title,
	icon,
	titleClassName,
	childrenClassName,
	children,
	...props
}: BannerProps) {
	const iconNode =
		icon ??
		(variant === "default" ? (
			<Info className="size-4 shrink-0 text-icon-info" aria-hidden />
		) : variant === "warning" ? (
			<AlertTriangle
				className="size-4 shrink-0 text-icon-warning"
				aria-hidden
			/>
		) : null);

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(bannerVariants({ variant }), className)}
			{...props}
		>
			<div className="flex items-center gap-3">
				{iconNode}
				<p
					className={cn(
						"text-sm font-semibold text-text-foreground",
						titleClassName,
					)}
				>
					{title}
				</p>
			</div>
			{children ? (
				<p
					className={cn(
						"pl-7 text-sm font-normal text-muted-foreground",
						childrenClassName,
					)}
				>
					{children}
				</p>
			) : null}
		</div>
	);
}

export { Banner, bannerVariants };
