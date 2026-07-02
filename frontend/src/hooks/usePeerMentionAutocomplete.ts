import { useEffect, useState } from "react";
import { listPeerMentions } from "@/api";
import { useDebounce } from "@/hooks";
import type { PeerMentionListItem } from "@/types";

export function usePeerMentionAutocomplete(query: string, enabled: boolean) {
	const debouncedQuery = useDebounce(query, 250);
	const [peers, setPeers] = useState<PeerMentionListItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			setPeers([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		setError(null);

		void listPeerMentions(debouncedQuery).then((result) => {
			if (cancelled) return;
			setIsLoading(false);
			if (!result.ok) {
				setPeers([]);
				setError(result.message);
				return;
			}
			setPeers(result.data.peers);
			setError(null);
		});

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, enabled]);

	return { peers, isLoading, error };
}
