import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlaceholderCardProps } from "@/types";

export function PlaceholderCard({
	icon: Icon,
	title,
	description,
	className,
	iconWrapperClassName,
	iconClassName,
	iconPixelSize = 34,
	iconStrokeWidth = 1.5,
}: PlaceholderCardProps) {
	return (
		<Card
			className={cn(
				"border border-transparent bg-background py-0 rounded-xl transition-colors",
				className,
			)}
		>
			<CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<div
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-xl p-1.5 bg-card-foreground dark:bg-muted",
						iconWrapperClassName,
					)}
				>
					<Icon
						className={cn("text-icon-disabled", iconClassName)}
						size={iconPixelSize}
						strokeWidth={iconStrokeWidth}
						aria-hidden="true"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<h3 className="text-base font-semibold text-text-foreground">
						{title}
					</h3>
					<p className="font-normal text-small leading-small text-muted-foreground tracking-normal text-center">
						{description}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
