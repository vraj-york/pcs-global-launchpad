import { Bot } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	ActionCard,
	AppLoader,
	AssessmentOnlyDashboardProfileSection,
	BehavioralProfileGraphCard,
	GrowthSparkCard,
	PeerSnapshotCard,
	PermissionGate,
	TakeAssessmentCard,
	UserDashboardOverallStylePill,
} from "@/components";
import {
	ASSESSMENT_ONLY_DASHBOARD,
	CHATBOT_COMPACT_CONTENT,
	SUBMODULE_KEYS,
	USER_DASHBOARD_CONTENT,
} from "@/const";
import { useSubscriptionAccess, useUserGroups } from "@/hooks";
import {
	captureFirstDashboardView,
	resolveFirstDashboardViewRoleBucket,
} from "@/lib";
import { shouldBlockSubscriptionRoute } from "@/lib/subscriptionAccessUi";
import { useChatbotStore, useUsersStore } from "@/store";
import type { LatestScoredAssessment } from "@/types";
import {
	formatAssessmentCompletedWithPrefix,
	isAssessmentOnlyDashboardUser,
	resolveLatestScoredAssessment,
} from "@/utils";

export function UserDashboardContent() {
	const { fullName } = useUsersStore();
	const { groups, ready } = useUserGroups();
	const subscriptionAccess = useSubscriptionAccess();
	const { canAccessChatbot, canAccessFullApp, loading, hasResolvedAccess } =
		subscriptionAccess;
	const isAssessmentOnlyDashboard =
		isAssessmentOnlyDashboardUser(subscriptionAccess);
	const openCompact = useChatbotStore((s) => s.openCompact);
	const [latestAssessment, setLatestAssessment] =
		useState<LatestScoredAssessment | null>(null);

	const handleOpenChatbot = useCallback(() => {
		openCompact();
	}, [openCompact]);

	const loadLatestAssessment = useCallback(async () => {
		if (!isAssessmentOnlyDashboard) {
			return;
		}
		const latest = await resolveLatestScoredAssessment();
		setLatestAssessment(latest);
	}, [isAssessmentOnlyDashboard]);

	useEffect(() => {
		if (!ready) return;
		captureFirstDashboardView(resolveFirstDashboardViewRoleBucket(groups));
	}, [ready, groups]);

	useEffect(() => {
		void loadLatestAssessment();
	}, [loadLatestAssessment]);

	if (shouldBlockSubscriptionRoute(loading, hasResolvedAccess)) {
		return <AppLoader className="min-h-80" />;
	}

	const displayName = fullName || USER_DASHBOARD_CONTENT.welcomeFallbackName;
	const welcomeSubtitle = isAssessmentOnlyDashboard
		? formatAssessmentCompletedWithPrefix(
				latestAssessment?.completedAt,
				ASSESSMENT_ONLY_DASHBOARD.welcomeSubtitlePrefix,
				ASSESSMENT_ONLY_DASHBOARD.welcomeSubtitleFallback,
			)
		: USER_DASHBOARD_CONTENT.welcomeSubtitle;

	if (isAssessmentOnlyDashboard) {
		return (
			<div className="flex flex-col gap-4">
				<div className="flex shrink-0 flex-col gap-3">
					<div>
						<h1 className="text-heading-4 font-semibold text-text-foreground">
							{USER_DASHBOARD_CONTENT.welcomePrefix} {displayName}{" "}
							{USER_DASHBOARD_CONTENT.welcomeEmoji}
						</h1>
						<p className="mt-1 text-small text-text-secondary">
							{welcomeSubtitle}
						</p>
					</div>
				</div>

				<AssessmentOnlyDashboardProfileSection />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{USER_DASHBOARD_CONTENT.welcomePrefix} {displayName}{" "}
						{USER_DASHBOARD_CONTENT.welcomeEmoji}
					</h1>
					<p className="mt-1 text-small text-text-secondary">
						{welcomeSubtitle}
					</p>
				</div>
				{canAccessFullApp && <UserDashboardOverallStylePill />}
			</div>

			<div className="grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch">
				<div className="flex flex-col gap-4 lg:col-span-2 lg:h-full lg:min-h-0">
					<PermissionGate permission={SUBMODULE_KEYS.ASSESSMENT_TAKE}>
						<TakeAssessmentCard className="lg:min-h-0 lg:flex-1" />
					</PermissionGate>

					{canAccessChatbot && (
						<ActionCard
							className="lg:min-h-0 lg:flex-1"
							icon={Bot}
							iconClassName="bg-info"
							hoverBorderClassName="hover:border-info"
							title={USER_DASHBOARD_CONTENT.chatBot.title}
							description={USER_DASHBOARD_CONTENT.chatBot.description}
							onClick={handleOpenChatbot}
							ariaLabel={CHATBOT_COMPACT_CONTENT.openButtonLabel}
						/>
					)}
				</div>

				{canAccessFullApp && (
					<div className="flex min-w-0 flex-col lg:col-span-3 lg:h-full lg:min-h-0">
						<GrowthSparkCard className="h-full min-h-0 flex-1" />
					</div>
				)}
			</div>
			{canAccessFullApp && <BehavioralProfileGraphCard />}
			{canAccessFullApp && <PeerSnapshotCard />}
		</div>
	);
}
