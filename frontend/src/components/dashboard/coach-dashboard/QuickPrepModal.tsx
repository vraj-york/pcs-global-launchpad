// Figma layer: "Schedule Session - Quick Prep" — node 4:21790
/*
 * SEMANTIC ANALYSIS
 * Modal (overlay + 640px popup) opened from a session's "Quick Prep" action.
 * - Header: title + description + close (X) → ContentModal header row
 * - Read-only info stack: Last Session On / Session Type / Client (avatar +
 *   name + email, with a divider) / Last Session Notes
 * - Footer: Cancel (outline) + Join Session (primary, video icon)
 */
import { Video } from "lucide-react";
import { ContentModal } from "@/components/common/ContentModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { COACH_DASHBOARD_CONTENT } from "@/const";

const Q = COACH_DASHBOARD_CONTENT.quickPrepModal;

export interface QuickPrepData {
	lastSessionOn: string;
	sessionType: string;
	clientName: string;
	clientEmail: string;
	clientInitials?: string;
	clientAvatar?: string;
	lastSessionNotes: string;
}

export interface QuickPrepModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Overrides merged over the sample quick-prep data. */
	data?: Partial<QuickPrepData>;
	onJoin?: () => void;
}

function InfoField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-small text-muted-foreground">{label}</span>
			<span className="text-small font-medium text-text-foreground">
				{value}
			</span>
		</div>
	);
}

export function QuickPrepModal({
	open,
	onOpenChange,
	data,
	onJoin,
}: QuickPrepModalProps) {
	const d: QuickPrepData = { ...Q.sample, ...data };

	return (
		<ContentModal
			open={open}
			onOpenChange={onOpenChange}
			title={Q.title}
			description={Q.description}
			contentClassName="w-full max-w-[640px] gap-0 overflow-hidden rounded-xl border border-border p-0"
		>
			<div className="flex flex-col gap-6 p-6">
				<InfoField label={Q.lastSessionOnLabel} value={d.lastSessionOn} />
				<InfoField label={Q.sessionTypeLabel} value={d.sessionType} />

				{/* Client */}
				<div className="flex flex-col gap-2">
					<span className="text-small text-muted-foreground">
						{Q.clientLabel}
					</span>
					<div className="flex items-center gap-3 border-b border-border pb-4">
						<Avatar size="lg">
							{d.clientAvatar ? (
								<AvatarImage src={d.clientAvatar} alt={d.clientName} />
							) : null}
							<AvatarFallback className="bg-muted font-semibold text-text-foreground">
								{d.clientInitials}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-col gap-1">
							<span className="truncate text-small font-medium text-text-foreground">
								{d.clientName}
							</span>
							<span className="truncate text-mini text-muted-foreground">
								{d.clientEmail}
							</span>
						</div>
					</div>
				</div>

				<InfoField
					label={Q.lastSessionNotesLabel}
					value={d.lastSessionNotes}
				/>
			</div>

			<DialogFooter className="mt-0 gap-2 border-t border-border px-6 py-5 sm:gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => onOpenChange(false)}
				>
					{Q.cancel}
				</Button>
				<Button
					type="button"
					icon={Video}
					onClick={() => {
						onJoin?.();
						onOpenChange(false);
					}}
				>
					{Q.join}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
