import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
	{
		variants: {
			variant: {
				default:
					"bg-interactive-primary text-light-same hover:bg-interactive-primary/80",
				outline:
					"border-border text-text-foreground bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs",
				secondary:
					"bg-brand-gray text-text-foreground hover:bg-brand-gray/80 aria-expanded:bg-brand-gray aria-expanded:text-text-foreground",
				ghost:
					"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive:
					"bg-interactive-error text-light-same hover:bg-interactive-error-hover active:bg-interactive-error-active focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 gap-2 px-4 py-1.5 in-data-[slot=button-group]:rounded-lg",
				xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-[[data-icon]]:px-4 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 rounded-[min(var(--radius-lg),10px)] px-3 py-1.5 in-data-[slot=button-group]:rounded-lg has-[[data-icon]]:px-4",
				lg: "h-10 gap-2 px-6 py-2.5 in-data-[slot=button-group]:rounded-lg",
				icon: "size-9",
				"icon-xs":
					"size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
				"icon-sm":
					"size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonIconPosition = "start" | "end";

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	icon: Icon,
	iconPosition = "start",
	isLoading = false,
	disabled,
	children,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		icon?: LucideIcon;
		iconPosition?: ButtonIconPosition;
		isLoading?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";
	const isDisabled = disabled || isLoading;
	const iconSlot = iconPosition === "end" ? "inline-end" : "inline-start";

	const iconElement = isLoading ? (
		<Loader2
			className="size-4 shrink-0 animate-spin"
			aria-hidden
			data-icon={iconSlot}
		/>
	) : Icon ? (
		<Icon className="size-4 shrink-0" aria-hidden data-icon={iconSlot} />
	) : null;

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
			disabled={isDisabled}
			aria-busy={isLoading || undefined}
		>
			{asChild ? (
				children
			) : (
				<>
					{iconPosition === "start" && iconElement}
					{children}
					{iconPosition === "end" && iconElement}
				</>
			)}
		</Comp>
	);
}

export { Button, buttonVariants };
