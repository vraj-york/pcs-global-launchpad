import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export type BSPBadgeType = string;

/**
 * Badge variants by type.
 */
function badgeVariantForType(type: string): BadgeVariant {
	switch (type?.toLowerCase()) {
		case "follow_up_chip":
			return "followUpChip";

		case "exec_sponsor":
		case "culture_leadership_program_owner":
		case "implementation_lead":
		case "project_manager":
		case "platform_administrator":
		case "behavioural_assessment_administrator":
		case "team_leader_manager":
		case "ach":
		case "monthly":
		case "internal":
		case "private":
		case "cc":
		case "in_progress":
			return "blue";

		case "budget_owner":
		case "finance_billing_contact":
		case "primary_contact":
		case "technical_it_lead":
		case "paid":
		case "active":
		case "public":
		case "annual":
		case "success":
		case "completed":
			return "green";

		case "hr_program_owner":
		case "hr_talent_development_owner":
		case "training_coordinator":
		case "power_user_champion":
		case "pending":
		case "one_time":
		case "external":
		case "past_due":
		case "payment_due":
		case "trialing":
			return "yellow";

		case "legal_compliance_contact":
		case "expired":
		case "offline":
		case "incomplete":
		case "inactive":
			return "gray";

		case "failed":
		case "suspended":
		case "closed":
		case "blocked":
		case "canceled":
		case "cancelled":
		case "expired_invite":
			return "destructive";

		case "active_filled":
		case "annual_filled":
			return "greenFilled";

		case "incomplete_filled":
		case "inactive_filled":
			return "purpleFilled";

		case "closed_filled":
		case "suspended_filled":
		case "blocked_filled":
		case "expired_filled":
			return "redFilled";

		case "one_time_filled":
		case "pending_filled":
			return "yellowFilled";

		default:
			return "default";
	}
}

export type BSPBadgeProps = Omit<
	React.ComponentProps<typeof Badge>,
	"variant"
> & {
	type: BSPBadgeType;
};

export function BSPBadge({ type, className, ...props }: BSPBadgeProps) {
	return (
		<Badge
			variant={badgeVariantForType(type)}
			className={cn(className)}
			{...props}
		/>
	);
}
