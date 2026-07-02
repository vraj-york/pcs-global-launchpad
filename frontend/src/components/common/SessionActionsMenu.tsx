// Figma layer: node 2733-86124 — session actions dropdown (Quick Prep / Cancel Session)
import { CalendarX, MoreVertical, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SESSION_ACTIONS_MENU_CONTENT } from "@/const";

export interface SessionActionsMenuProps {
	/** Fired when "Quick Prep" is selected. */
	onQuickPrep?: () => void;
	/** Fired when "Cancel Session" is selected. */
	onCancelSession?: () => void;
	/** Disable the whole menu (e.g. while a session mutation is in flight). */
	disabled?: boolean;
	/** Alignment of the menu relative to the trigger. */
	align?: "start" | "center" | "end";
}

/**
 * Row/card action menu for a scheduled session. Reuses the shared shadcn
 * DropdownMenu; the destructive "Cancel Session" item uses the built-in
 * `variant="destructive"` (red text + `bg-destructive/10` highlight).
 */
export function SessionActionsMenu({
	onQuickPrep,
	onCancelSession,
	disabled = false,
	align = "start",
}: SessionActionsMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={SESSION_ACTIONS_MENU_CONTENT.triggerLabel}
					icon={MoreVertical}
					disabled={disabled}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="min-w-52">
				<DropdownMenuItem onSelect={() => onQuickPrep?.()}>
					<Zap className="size-4 text-icon-primary" aria-hidden />
					{SESSION_ACTIONS_MENU_CONTENT.quickPrep}
				</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onSelect={() => onCancelSession?.()}
				>
					<CalendarX className="size-4" aria-hidden />
					{SESSION_ACTIONS_MENU_CONTENT.cancelSession}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
