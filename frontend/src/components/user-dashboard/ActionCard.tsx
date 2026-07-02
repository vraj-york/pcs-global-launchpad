import { Card, CardContent } from "@/components/ui/card";
import { USER_DASHBOARD_TOP_ACTION_ICON_SIZE } from "@/const";
import { cn } from "@/lib/utils";
import type { ActionCardProps } from "@/types";

export function ActionCard({
	icon: Icon,
	iconClassName,
	hoverBorderClassName,
	title,
	description,
	className,
	iconSize = USER_DASHBOARD_TOP_ACTION_ICON_SIZE,
	onClick,
	ariaLabel,
}: ActionCardProps) {
	const isInteractive = onClick != null;

	const handleClick = () => {
		onClick?.();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isInteractive) {
			return;
		}
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	return (
		<Card
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
			aria-label={ariaLabel ?? title}
			onClick={isInteractive ? handleClick : undefined}
			onKeyDown={handleKeyDown}
			className={cn(
				"h-full border border-transparent bg-background py-0 rounded-xl transition-all hover:shadow-md",
				hoverBorderClassName,
				isInteractive &&
					"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
		>
			<CardContent className="flex flex-col gap-4 p-6">
				<div
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-xl p-1.5",
						iconClassName,
					)}
				>
					<Icon
						className="text-white"
						size={iconSize}
						strokeWidth={2}
						aria-hidden="true"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<h3 className="text-xl font-semibold text-text-foreground">
						{title}
					</h3>
					<p className="font-normal text-small leading-small text-muted-foreground tracking-normal text-left">
						{description}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
