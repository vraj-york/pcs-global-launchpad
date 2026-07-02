import type { SubscriptionAccessData } from "./user.types";

export type SubscriptionAccessStoreState = {
	data: SubscriptionAccessData | null;
	loading: boolean;
	refreshing: boolean;
	fetchAttempted: boolean;
	loadInFlight: boolean;
	chatbotUnlockRefreshForCount: number | null;
};

export type SubscriptionAccessStoreActions = {
	fetchSubscriptionAccess: (
		background?: boolean,
	) => Promise<SubscriptionAccessData | null>;
	resetSubscriptionAccess: () => void;
	setChatbotUnlockRefreshForCount: (count: number | null) => void;
};

export type SubscriptionAccessStore = SubscriptionAccessStoreState &
	SubscriptionAccessStoreActions;
