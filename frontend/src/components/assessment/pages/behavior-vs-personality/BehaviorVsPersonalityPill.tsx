import { Drama, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
	BehaviorVsPersonalityPillIconKey,
	BehaviorVsPersonalityPillProps,
} from "@/types";

const PILL_ICONS: Record<BehaviorVsPersonalityPillIconKey, typeof Sparkle> = {
	sparkle: Sparkle,
	drama: Drama,
};

export function BehaviorVsPersonalityPill({
	pill,
	variant = "default",
}: BehaviorVsPersonalityPillProps) {
	const isPrint = variant === "print";
	const Icon = PILL_ICONS[pill.icon];

	return (
		<article
			className={cn(
				"flex min-h-0 w-full min-w-0 flex-1 rounded-2xl",
				isPrint ? "gap-2 p-3" : "gap-4 p-6",
				pill.surfaceClassName,
			)}
		>
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-lg",
					isPrint ? "size-8 p-1.5" : "size-10 p-2.5",
					pill.iconButtonClassName,
				)}
			>
				<Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h4
					className={cn(
						"font-semibold",
						isPrint
							? "text-small leading-small"
							: "text-heading-4 leading-heading-4 tracking-heading-4",
					)}
				>
					{pill.title}
				</h4>
				<p
					className={cn(
						"font-normal tracking-wide",
						isPrint ? "text-mini leading-mini" : "text-small leading-small",
					)}
				>
					{pill.description}
				</p>
			</div>
		</article>
	);
}
