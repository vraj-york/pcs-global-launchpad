import { create } from "zustand";
import { getSubscriptionAccess } from "@/api";
import { isSubscriptionBackgroundFetch } from "@/lib/subscriptionAccessUi";
import type {
	SubscriptionAccessData,
	SubscriptionAccessStore,
	SubscriptionAccessStoreState,
} from "@/types";

const initialState: SubscriptionAccessStoreState = {
	data: null,
	loading: false,
	refreshing: false,
	fetchAttempted: false,
	loadInFlight: false,
	chatbotUnlockRefreshForCount: null,
};

let subscriptionAccessLoadPromise: Promise<SubscriptionAccessData | null> | null =
	null;

export const useSubscriptionAccessStore = create<SubscriptionAccessStore>()(
	(set, get) => ({
		...initialState,

		resetSubscriptionAccess: () => {
			subscriptionAccessLoadPromise = null;
			set(initialState);
		},

		setChatbotUnlockRefreshForCount: (count) => {
			set({ chatbotUnlockRefreshForCount: count });
		},

		fetchSubscriptionAccess: async (background) => {
			const state = get();
			const isBackground = isSubscriptionBackgroundFetch(
				state.data !== null,
				background,
			);

			if (
				!isBackground &&
				state.fetchAttempted &&
				state.data !== null &&
				!state.loadInFlight
			) {
				return state.data;
			}

			if (subscriptionAccessLoadPromise) {
				return subscriptionAccessLoadPromise;
			}

			subscriptionAccessLoadPromise = (async () => {
				set({
					loadInFlight: true,
					loading: isBackground ? state.loading : true,
					refreshing: isBackground ? true : state.refreshing,
				});

				let nextData: SubscriptionAccessData | null = state.data;

				try {
					const result = await getSubscriptionAccess();
					if (result.ok) {
						nextData = result.data;
						set({ data: result.data });
					}
				} finally {
					subscriptionAccessLoadPromise = null;
					set((current) => ({
						loadInFlight: false,
						loading: isBackground ? current.loading : false,
						refreshing: isBackground ? false : current.refreshing,
						fetchAttempted: isBackground ? current.fetchAttempted : true,
					}));
				}

				return nextData;
			})();

			return subscriptionAccessLoadPromise;
		},
	}),
);
