import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ROUTES,
	SUBSCRIPTION_ACCESS_CONTENT,
	USER_DASHBOARD_CONTENT,
	USER_DASHBOARD_TOP_ACTION_ICON_SIZE,
} from "@/const";
import { useSubscriptionAccess } from "@/hooks";
import { cn } from "@/lib/utils";
import type { TakeAssessmentCardProps } from "@/types";

export function TakeAssessmentCard({
	className,
}: TakeAssessmentCardProps = {}) {
	const navigate = useNavigate();
	const { canStartAssessment, loading: subscriptionLoading } =
		useSubscriptionAccess();
	const isDisabled = subscriptionLoading || !canStartAssessment;
	const showDisabledTooltip = !subscriptionLoading && !canStartAssessment;

	const handleClick = () => {
		if (isDisabled) {
			return;
		}
		navigate(ROUTES.assessment.introEntry);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (isDisabled) {
			return;
		}
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	const card = (
		<Card
			role={isDisabled ? undefined : "button"}
			tabIndex={isDisabled ? -1 : 0}
			aria-disabled={isDisabled || undefined}
			aria-label={
				showDisabledTooltip
					? SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip
					: USER_DASHBOARD_CONTENT.takeAssessment.title
			}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={cn(
				"group h-full border border-transparent relative overflow-hidden bg-background py-0 transition-all rounded-2xl",
				isDisabled
					? "cursor-not-allowed opacity-60"
					: "cursor-pointer hover:shadow-md hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
		>
			<ClipboardList
				className="pointer-events-none absolute z-0 -right-3 -top-11 size-32 -rotate-[22deg] origin-top-right text-brand-green opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-20"
				strokeWidth={1.75}
				aria-hidden="true"
			/>

			<CardContent className="relative z-10 flex flex-col gap-4 p-6">
				<div
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-xl p-1.5",
						"bg-success",
					)}
				>
					<ClipboardList
						className="text-white"
						size={USER_DASHBOARD_TOP_ACTION_ICON_SIZE}
						strokeWidth={2}
						aria-hidden="true"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<h3 className="text-xl font-semibold text-text-foreground">
						{USER_DASHBOARD_CONTENT.takeAssessment.title}
					</h3>
					<p className="font-normal text-small leading-small text-muted-foreground tracking-normal text-left">
						{USER_DASHBOARD_CONTENT.takeAssessment.description}
					</p>
				</div>
			</CardContent>
		</Card>
	);

	if (showDisabledTooltip) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="block h-full">{card}</span>
				</TooltipTrigger>
				<TooltipContent side="top">
					{SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip}
				</TooltipContent>
			</Tooltip>
		);
	}

	return card;
}
