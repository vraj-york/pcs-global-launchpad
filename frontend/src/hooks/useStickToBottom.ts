import {
	type DependencyList,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
} from "react";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

type StickToBottom = {
	containerRef: RefObject<HTMLDivElement | null>;
	handleScroll: () => void;
};

/**
 * Auto-scrolls the container to the bottom when `deps` change, but only while
 * the user is already near the bottom.
 */
export function useStickToBottom(deps: DependencyList): StickToBottom {
	const containerRef = useRef<HTMLDivElement>(null);
	const stickToBottomRef = useRef(true);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
	}, []);

	useEffect(() => {
		const el = containerRef.current;
		if (el && stickToBottomRef.current) {
			el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
		}
	}, deps);

	return { containerRef, handleScroll };
}
