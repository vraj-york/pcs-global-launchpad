import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"h-9 w-full min-w-0 rounded-lg border border-border bg-transparent px-2.5 py-1 text-text-foreground shadow-none transition-colors text-sm",
				"placeholder:text-muted-foreground",
				"placeholder:font-normal",
				"focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-border",
				"file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-foreground",
				"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-destructive aria-invalid:ring-0",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
