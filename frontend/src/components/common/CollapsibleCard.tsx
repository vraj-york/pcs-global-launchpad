"use client";

import { ChevronUp } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const COLLAPSIBLE_CARD_ARIA = {
	collapse: "Collapse section",
	expand: "Expand section",
} as const;

export type CollapsibleCardProps = {
	title: React.ReactNode;
	children: React.ReactNode;
	defaultOpen?: boolean;
	className?: string;
	contentClassName?: string;
	/** Fires when the section is expanded or collapsed (in addition to internal state). */
	onOpenChange?: (open: boolean) => void;
};

function CollapsibleCard({
	title,
	children,
	defaultOpen = true,
	className,
	contentClassName,
	onOpenChange,
}: CollapsibleCardProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<Collapsible
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onOpenChange?.(next);
			}}
		>
			<Card
				className={cn(
					"bg-background border border-border !pt-0",
					!open && "!pb-0",
					className,
				)}
				size="sm"
			>
				<CollapsibleTrigger asChild>
					<CardHeader
						className={cn(
							"flex flex-row items-center justify-between w-full p-4 cursor-pointer select-none rounded-t-xl",
							open && "border-b border-border",
						)}
						aria-label={
							open
								? COLLAPSIBLE_CARD_ARIA.collapse
								: COLLAPSIBLE_CARD_ARIA.expand
						}
					>
						<CardTitle className="text-base font-medium text-text-secondary min-h-[2rem] flex items-center">
							{title}
						</CardTitle>
						<CardAction className="pointer-events-none shrink-0 self-center">
							<span
								className={cn(
									"inline-flex size-8 items-center justify-center rounded-lg bg-card text-secondary-foreground transition-transform duration-200 ease-out",
									!open && "rotate-180",
								)}
								aria-hidden
							>
								<ChevronUp className="size-3.5" />
							</span>
						</CardAction>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent
						className={cn("flex flex-col gap-4 pt-0", contentClassName)}
					>
						{children}
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

export { CollapsibleCard };
