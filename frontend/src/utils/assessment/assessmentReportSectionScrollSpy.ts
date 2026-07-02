import {
	ASSESSMENT_REPORT_RESULTS_NAV,
	ASSESSMENT_REPORT_SECTION_SCROLL_SPY,
} from "@/const";
import type {
	AssessmentReportResultsNavId,
	AssessmentReportSectionScrollNode,
} from "@/types";

export function getReportScrollParent(
	element: HTMLElement | null,
): HTMLElement | null {
	let parent = element?.parentElement ?? null;
	while (parent) {
		const { overflowY } = getComputedStyle(parent);
		if (overflowY === "auto" || overflowY === "scroll") {
			return parent;
		}
		parent = parent.parentElement;
	}
	return null;
}

export function readReportSectionScrollMarginTopPx(
	section: HTMLElement,
): number {
	const parsed = Number.parseFloat(getComputedStyle(section).scrollMarginTop);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	const rootFontSize = Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
	return Number.isFinite(rootFontSize)
		? ASSESSMENT_REPORT_SECTION_SCROLL_SPY.scrollMt28Rem * rootFontSize
		: 0;
}

export function resolveReportSectionScrollSpyOffsetPx(
	sections: readonly AssessmentReportSectionScrollNode[],
): number {
	const withMargin = sections.find(
		({ element }) => readReportSectionScrollMarginTopPx(element) > 0,
	);
	if (withMargin) {
		return readReportSectionScrollMarginTopPx(withMargin.element);
	}
	return readReportSectionScrollMarginTopPx(sections[0]!.element);
}

export function isReportSectionAtScrollSpyLine(
	element: HTMLElement,
	scrollRoot: HTMLElement | null,
	offsetPx: number,
): boolean {
	const { sectionAlignTolerancePx } = ASSESSMENT_REPORT_SECTION_SCROLL_SPY;
	const rootTop = scrollRoot?.getBoundingClientRect().top ?? 0;
	const line = rootTop + offsetPx;
	const sectionTop = element.getBoundingClientRect().top;
	return Math.abs(sectionTop - line) <= sectionAlignTolerancePx;
}

export function scrollReportSectionIntoView(targetSectionId: string): void {
	const element = document.getElementById(targetSectionId);
	if (!element) {
		return;
	}

	const { scrollIntoViewBehavior, scrollIntoViewBlock } =
		ASSESSMENT_REPORT_SECTION_SCROLL_SPY;
	const scrollRoot = getReportScrollParent(element);
	const offsetPx = readReportSectionScrollMarginTopPx(element);

	if (scrollRoot) {
		const rootRect = scrollRoot.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();
		const nextTop =
			scrollRoot.scrollTop + (elementRect.top - rootRect.top) - offsetPx;

		scrollRoot.scrollTo({
			top: Math.max(0, nextTop),
			behavior: scrollIntoViewBehavior,
		});
		return;
	}

	element.scrollIntoView({
		behavior: scrollIntoViewBehavior,
		block: scrollIntoViewBlock,
	});
}

export function collectReportSectionScrollNodes(): AssessmentReportSectionScrollNode[] {
	return ASSESSMENT_REPORT_RESULTS_NAV.flatMap((item) => {
		const element = document.getElementById(item.targetSectionId);
		return element ? [{ navId: item.id, element }] : [];
	});
}

function readSectionVisibleHeightBelowLine(
	element: HTMLElement,
	line: number,
	viewportBottom: number,
): number {
	const { top, bottom } = element.getBoundingClientRect();
	const visibleTop = Math.max(top, line);
	const visibleBottom = Math.min(bottom, viewportBottom);
	return Math.max(0, visibleBottom - visibleTop);
}

export function resolveActiveReportNavId(
	sections: readonly AssessmentReportSectionScrollNode[],
	scrollRoot: HTMLElement | null,
	offsetPx: number,
): AssessmentReportResultsNavId {
	if (sections.length === 0) {
		return ASSESSMENT_REPORT_RESULTS_NAV[0]!.id;
	}

	const rootRect = scrollRoot?.getBoundingClientRect();
	const rootTop = rootRect?.top ?? 0;
	const viewportBottom = rootRect?.bottom ?? window.innerHeight;
	const line = rootTop + offsetPx;

	let activeNavId = sections[0]!.navId;
	let bestVisibleHeight = -1;

	for (const { navId, element } of sections) {
		const visibleHeight = readSectionVisibleHeightBelowLine(
			element,
			line,
			viewportBottom,
		);

		if (visibleHeight > bestVisibleHeight) {
			bestVisibleHeight = visibleHeight;
			activeNavId = navId;
		}
	}

	return activeNavId;
}

export function runAfterReportScrollSettles(
	scrollTarget: HTMLElement | Window,
	onSettled: () => void,
): () => void {
	const { scrollIdleFrames, navScrollSafetyMs } =
		ASSESSMENT_REPORT_SECTION_SCROLL_SPY;
	const cleanups: Array<() => void> = [];
	let settled = false;

	const settle = () => {
		if (settled) {
			return;
		}
		settled = true;
		for (const cleanup of cleanups) {
			cleanup();
		}
		onSettled();
	};

	if (scrollTarget instanceof HTMLElement && "onscrollend" in scrollTarget) {
		const onScrollEnd = () => settle();
		scrollTarget.addEventListener("scrollend", onScrollEnd, { once: true });
		cleanups.push(() =>
			scrollTarget.removeEventListener("scrollend", onScrollEnd),
		);
	}

	let rafId = 0;
	let lastScrollTop =
		scrollTarget instanceof HTMLElement
			? scrollTarget.scrollTop
			: window.scrollY;
	let idleFrames = 0;

	const poll = () => {
		const scrollTop =
			scrollTarget instanceof HTMLElement
				? scrollTarget.scrollTop
				: window.scrollY;

		if (scrollTop === lastScrollTop) {
			idleFrames += 1;
			if (idleFrames >= scrollIdleFrames) {
				settle();
				return;
			}
		} else {
			idleFrames = 0;
			lastScrollTop = scrollTop;
		}

		rafId = requestAnimationFrame(poll);
	};

	rafId = requestAnimationFrame(poll);
	cleanups.push(() => cancelAnimationFrame(rafId));

	const safetyId = window.setTimeout(settle, navScrollSafetyMs);
	cleanups.push(() => window.clearTimeout(safetyId));

	return () => {
		if (!settled) {
			for (const cleanup of cleanups) {
				cleanup();
			}
		}
	};
}
