import type { ReactNode } from "react";
import type { WagonWheelSpokeId } from "@/types";

export type PeerSnapshotItem = {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	avatar: string | null;
	styleNumber: number | null;
	styleTitle: string | null;
	styleDescription: string | null;
};

export type PeerSnapshotData = {
	totalCount: number;
	peers: PeerSnapshotItem[];
};

export type PeerSnapshotCardPhase = "loading" | "ready" | "error" | "empty";

export type PeerSnapshotCardProps = {
	className?: string;
};

export type PeerSnapshotCardShellProps = {
	className?: string;
	children: ReactNode;
};

export type PeerSnapshotWheelPanelProps = {
	selectedPeer: PeerSnapshotItem | null;
	peerSpokes: readonly WagonWheelSpokeId[];
	selectedSpoke: WagonWheelSpokeId | null;
	isAdaptarianSelected: boolean;
	hasAdaptarianPeers: boolean;
	onSpokeSelect: (spoke: WagonWheelSpokeId) => void;
	onHubSelect: () => void;
};

export type PeerSnapshotMemberListProps = {
	peers: PeerSnapshotItem[];
	selectedPeerId: string | null;
	searchQuery: string;
	isSearching: boolean;
	onSearchChange: (value: string) => void;
	onPeerSelect: (peerId: string) => void;
};

export type SplitStyleDescription = {
	lead: string | null;
	body: string | null;
};

export type PeerSnapshotStore = {
	totalCount: number;
	peers: PeerSnapshotItem[];
	phase: PeerSnapshotCardPhase;
	searchLoading: boolean;
	searchPeers: PeerSnapshotItem[] | null;
	searchRequestId: number;
	fetchPeerSnapshot: () => Promise<void>;
	searchPeerSnapshot: (query: string) => Promise<void>;
	clearSearchResults: () => void;
	reset: () => void;
};
