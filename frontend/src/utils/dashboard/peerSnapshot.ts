import { ASSESSMENT_REPORT_ADAPTARIAN } from "@/const";
import type {
	PeerSnapshotItem,
	SplitStyleDescription,
	WagonWheelSpokeId,
} from "@/types";
import {
	isAdaptarianStyleNumber,
	styleNumberToSpokeId,
} from "@/utils/assessment/assessmentUserStyles";

export function formatPeerDisplayName(peer: PeerSnapshotItem): string {
	const first = peer.firstName?.trim() ?? "";
	const last = peer.lastName?.trim() ?? "";
	const full = `${first} ${last}`.trim();
	return full || peer.email?.trim() || "Unknown member";
}

export function truncateToFirstStatement(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}

	const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
	if (match) {
		return match[0].trim();
	}

	return trimmed;
}

export function splitStyleDescription(
	description: string | null,
): SplitStyleDescription {
	const firstStatement = truncateToFirstStatement(description);
	if (!firstStatement) {
		return { lead: null, body: null };
	}

	const emDashIndex = firstStatement.indexOf(" — ");
	if (emDashIndex >= 0) {
		return {
			lead: firstStatement.slice(0, emDashIndex).trim(),
			body: firstStatement.slice(emDashIndex + 3).trim() || null,
		};
	}

	const hyphenIndex = firstStatement.indexOf(" - ");
	if (hyphenIndex >= 0) {
		return {
			lead: firstStatement.slice(0, hyphenIndex).trim(),
			body: firstStatement.slice(hyphenIndex + 3).trim() || null,
		};
	}

	return { lead: firstStatement, body: null };
}

export function formatPeerSnapshotStyleDescription(
	description: string | null,
): string | null {
	const { lead, body } = splitStyleDescription(description);
	if (lead && body) {
		return `${lead} — ${body}`;
	}
	return lead ?? body;
}

export function resolvePeerSnapshotSelection(
	peerList: readonly PeerSnapshotItem[],
): {
	spoke: WagonWheelSpokeId | null;
	peerId: string | null;
} {
	const spokes = collectPeerHighlightSpokes(peerList);
	const spoke = spokes[0] ?? null;
	if (!spoke) {
		return { spoke: null, peerId: null };
	}
	return {
		spoke,
		peerId: filterPeersBySpoke(peerList, spoke)[0]?.id ?? null,
	};
}

export function collectPeerHighlightSpokes(
	peers: readonly PeerSnapshotItem[],
): WagonWheelSpokeId[] {
	const spokes = new Set<WagonWheelSpokeId>();
	for (const peer of peers) {
		if (peer.styleNumber == null) continue;
		const spoke = styleNumberToSpokeId(peer.styleNumber);
		if (spoke != null) {
			spokes.add(spoke);
		}
	}
	return [...spokes].sort((a, b) => a - b);
}

export function hasAdaptarianPeers(
	peers: readonly PeerSnapshotItem[],
): boolean {
	return peers.some(
		(peer) =>
			peer.styleNumber != null && isAdaptarianStyleNumber(peer.styleNumber),
	);
}

export function filterPeersByAdaptarian(
	peers: readonly PeerSnapshotItem[],
): PeerSnapshotItem[] {
	return peers.filter(
		(peer) =>
			peer.styleNumber != null && isAdaptarianStyleNumber(peer.styleNumber),
	);
}

export function getPeerSnapshotVisibleSpokes(
	peerSpokes: readonly WagonWheelSpokeId[],
	isAdaptarianSelected: boolean,
): WagonWheelSpokeId[] {
	if (isAdaptarianSelected) {
		return [...ASSESSMENT_REPORT_ADAPTARIAN.wheelHighlightSpokes];
	}
	return [...peerSpokes];
}

export function filterPeersBySpoke(
	peers: readonly PeerSnapshotItem[],
	spoke: WagonWheelSpokeId | null,
): PeerSnapshotItem[] {
	if (spoke == null) {
		return [...peers];
	}
	return peers.filter(
		(peer) => styleNumberToSpokeId(peer.styleNumber ?? NaN) === spoke,
	);
}
