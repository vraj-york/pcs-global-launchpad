import { ChevronUp } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PromoCodeFormCollapsibleSectionProps } from "@/types";

export function PromoCodeFormCollapsibleSection({
	title,
	open,
	onOpenChange,
	children,
}: PromoCodeFormCollapsibleSectionProps) {
	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<Collapsible open={open} onOpenChange={onOpenChange}>
				<CollapsibleTrigger
					type="button"
					className="flex w-full items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/25 data-[state=open]:bg-muted/15"
				>
					<span className="text-base font-normal text-foreground">{title}</span>
					<span
						className={cn(
							"inline-flex size-8 items-center justify-center rounded-lg bg-card text-secondary-foreground transition-transform duration-200 ease-out",
							!open && "rotate-180",
						)}
						aria-hidden
					>
						<ChevronUp className="size-3.5" />
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="space-y-4 p-4">{children}</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
