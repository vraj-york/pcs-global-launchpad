"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer group size-4 shrink-0 cursor-pointer rounded-sm border border-border bg-background shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
				"data-[state=checked]:border-interactive-primary data-[state=checked]:bg-interactive-primary data-[state=checked]:text-primary-foreground",
				"data-[state=indeterminate]:border-interactive-primary data-[state=indeterminate]:bg-interactive-primary data-[state=indeterminate]:text-primary-foreground",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
				<Check
					className="size-3 group-data-[state=indeterminate]:hidden"
					aria-hidden
				/>
				<Minus
					className="size-3 hidden group-data-[state=indeterminate]:block"
					aria-hidden
				/>
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
