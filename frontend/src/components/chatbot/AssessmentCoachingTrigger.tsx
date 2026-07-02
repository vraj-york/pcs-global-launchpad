import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUserAssessmentStylesContext } from "@/components/assessment";
import { CHATBOT_ASSESSMENT_TRIGGER_CONTENT } from "@/const";
import { useSubscriptionAccess } from "@/hooks";
import { useChatbotStore, useUsersStore } from "@/store";
import type { AssessmentCoachingTriggerProps } from "@/types";
import { buildAssessmentTriggerPayload } from "@/utils";

export function AssessmentCoachingTrigger({
	assessmentId,
	displayName,
	enabled,
}: AssessmentCoachingTriggerProps) {
	const {
		canAccessChatbot,
		isSuperAdmin,
		loading: subscriptionLoading,
		refreshing: subscriptionRefreshing,
	} = useSubscriptionAccess();
	const { userProfile } = useUsersStore();
	const { loadState, styles } = useUserAssessmentStylesContext();
	const bootstrapAssessmentTrigger = useChatbotStore(
		(s) => s.bootstrapAssessmentTrigger,
	);
	const startedRef = useRef(false);
	const planBlockedRef = useRef(false);
	const inFlightRef = useRef(false);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		if (
			subscriptionLoading ||
			subscriptionRefreshing ||
			startedRef.current ||
			inFlightRef.current
		) {
			return;
		}

		if (!canAccessChatbot && !isSuperAdmin) {
			if ((userProfile?.assessmentCompletionCount ?? 0) > 0) {
				return;
			}
			if (!planBlockedRef.current) {
				planBlockedRef.current = true;
				toast.error(CHATBOT_ASSESSMENT_TRIGGER_CONTENT.planRequired);
			}
			return;
		}

		if (loadState !== "ok" || !assessmentId.trim()) {
			return;
		}

		const payload = buildAssessmentTriggerPayload(
			assessmentId,
			displayName,
			styles,
		);
		let cancelled = false;
		inFlightRef.current = true;

		void (async () => {
			const outcome = await bootstrapAssessmentTrigger(payload);
			inFlightRef.current = false;
			if (cancelled) {
				return;
			}
			if (
				outcome === "success" ||
				outcome === "skipped_duplicate" ||
				outcome === "aborted"
			) {
				startedRef.current = true;
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		assessmentId,
		bootstrapAssessmentTrigger,
		canAccessChatbot,
		displayName,
		enabled,
		isSuperAdmin,
		loadState,
		styles,
		subscriptionLoading,
		subscriptionRefreshing,
		userProfile?.assessmentCompletionCount,
	]);

	return null;
}
