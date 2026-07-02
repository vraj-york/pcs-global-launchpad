"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Collapsible({
	...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
	return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
	className,
	...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
	return (
		<CollapsiblePrimitive.Trigger
			data-slot="collapsible-trigger"
			className={cn("outline-none", className)}
			{...props}
		/>
	);
}

function CollapsibleContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
	return (
		<CollapsiblePrimitive.Content
			data-slot="collapsible-content"
			className={cn("collapsible-animated overflow-hidden", className)}
			{...props}
		>
			<div className="overflow-hidden">{children}</div>
		</CollapsiblePrimitive.Content>
	);
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
