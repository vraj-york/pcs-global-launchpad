import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MessageTimestampLabelProps } from "@/types";
import {
	formatMessageInlineTimestamp,
	formatMessageTooltipLines,
} from "@/utils";

export function MessageTimestampLabel({
	createdAt,
	className,
}: MessageTimestampLabelProps) {
	const { line1, line2 } = formatMessageTooltipLines(createdAt);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className={cn(
						"inline min-h-0 border-0 bg-transparent p-0 text-left font-medium text-brand-secondary shadow-none outline-none",
						"rounded-sm",
						"hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
						className,
					)}
				>
					{formatMessageInlineTimestamp(createdAt)}
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				sideOffset={6}
				className="min-w-0 max-w-56 rounded-lg px-4 py-2.5 text-center text-xs font-medium"
			>
				<div className="flex flex-col gap-1 leading-tight">
					<p>{line1}</p>
					{line2 ? <p className="text-inherit opacity-90">{line2}</p> : null}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
