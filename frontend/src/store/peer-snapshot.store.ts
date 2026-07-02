import { create } from "zustand";
import { getMyPeerSnapshot } from "@/api/users.api";
import { isApiError } from "@/lib";
import type { PeerSnapshotStore } from "@/types";

const initialState = {
	totalCount: 0,
	peers: [] as PeerSnapshotStore["peers"],
	phase: "loading" as PeerSnapshotStore["phase"],
	searchLoading: false,
	searchPeers: null as PeerSnapshotStore["searchPeers"],
	searchRequestId: 0,
};

export const usePeerSnapshotStore = create<PeerSnapshotStore>()((set, get) => ({
	...initialState,

	fetchPeerSnapshot: async () => {
		set({ phase: "loading" });
		const result = await getMyPeerSnapshot();

		if (isApiError(result)) {
			set({ phase: "error" });
			return;
		}

		if (result.data.peers.length === 0 && result.data.totalCount === 0) {
			set({
				totalCount: 0,
				peers: [],
				phase: "empty",
				searchPeers: null,
				searchLoading: false,
			});
			return;
		}

		set({
			totalCount: result.data.totalCount,
			peers: result.data.peers,
			phase: "ready",
			searchPeers: null,
			searchLoading: false,
		});
	},

	searchPeerSnapshot: async (query: string) => {
		const trimmed = query.trim();
		if (!trimmed) {
			get().clearSearchResults();
			return;
		}

		const requestId = get().searchRequestId + 1;
		set({ searchLoading: true, searchRequestId: requestId });
		const result = await getMyPeerSnapshot(trimmed);

		if (get().searchRequestId !== requestId) {
			return;
		}

		set({ searchLoading: false });

		if (isApiError(result)) {
			return;
		}

		set({ searchPeers: result.data.peers });
	},

	clearSearchResults: () => {
		const requestId = get().searchRequestId + 1;
		set({
			searchPeers: null,
			searchLoading: false,
			searchRequestId: requestId,
		});
	},

	reset: () => set(initialState),
}));
