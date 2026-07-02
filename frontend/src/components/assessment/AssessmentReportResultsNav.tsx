import { useCallback, useEffect, useRef, useState } from "react";
import {
	ASSESSMENT_REPORT_RESULTS_NAV,
	ASSESSMENT_REPORT_RESULTS_NAV_STYLES,
	ASSESSMENT_REPORT_RESULTS_PAGE,
} from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportResultsNavId } from "@/types";
import {
	collectReportSectionScrollNodes,
	getReportScrollParent,
	isReportSectionAtScrollSpyLine,
	resolveActiveReportNavId,
	resolveReportSectionScrollSpyOffsetPx,
	runAfterReportScrollSettles,
	scrollReportSectionIntoView,
} from "@/utils";

const navStyles = ASSESSMENT_REPORT_RESULTS_NAV_STYLES;

export function AssessmentReportResultsNav() {
	const [activeId, setActiveId] = useState<AssessmentReportResultsNavId>(
		ASSESSMENT_REPORT_RESULTS_NAV[0]!.id,
	);
	const suppressSpyRef = useRef(false);
	const pendingNavIdRef = useRef<AssessmentReportResultsNavId | null>(null);
	const releaseSuppressRef = useRef<(() => void) | null>(null);
	const scrollTargetRef = useRef<HTMLElement | Window | null>(null);
	const handleScrollRef = useRef<(() => void) | null>(null);

	const updateActiveFromScroll = useCallback(() => {
		if (suppressSpyRef.current) {
			return;
		}

		const sections = collectReportSectionScrollNodes();
		if (sections.length === 0) {
			return;
		}

		const scrollRoot = getReportScrollParent(sections[0]!.element);
		const offsetPx = resolveReportSectionScrollSpyOffsetPx(sections);

		if (pendingNavIdRef.current) {
			const pendingSection = sections.find(
				({ navId }) => navId === pendingNavIdRef.current,
			);

			if (
				pendingSection &&
				!isReportSectionAtScrollSpyLine(
					pendingSection.element,
					scrollRoot,
					offsetPx,
				)
			) {
				setActiveId((prev) =>
					prev === pendingNavIdRef.current ? prev : pendingNavIdRef.current!,
				);
				return;
			}

			pendingNavIdRef.current = null;
		}

		const nextId = resolveActiveReportNavId(sections, scrollRoot, offsetPx);
		setActiveId((prev) => (prev === nextId ? prev : nextId));
	}, []);

	const bindScrollListener = useCallback(() => {
		if (!handleScrollRef.current) {
			handleScrollRef.current = () => {
				updateActiveFromScroll();
			};
		}

		const sections = collectReportSectionScrollNodes();
		const scrollRoot =
			sections.length > 0 ? getReportScrollParent(sections[0]!.element) : null;
		const nextTarget: HTMLElement | Window = scrollRoot ?? window;

		if (scrollTargetRef.current === nextTarget) {
			return nextTarget;
		}

		const handleScroll = handleScrollRef.current;

		if (scrollTargetRef.current) {
			scrollTargetRef.current.removeEventListener("scroll", handleScroll);
		}

		scrollTargetRef.current = nextTarget;
		nextTarget.addEventListener("scroll", handleScroll, { passive: true });

		return nextTarget;
	}, [updateActiveFromScroll]);

	const setActiveFromNavClick = useCallback(
		(navId: AssessmentReportResultsNavId) => {
			suppressSpyRef.current = true;
			pendingNavIdRef.current = navId;
			setActiveId(navId);

			if (releaseSuppressRef.current) {
				releaseSuppressRef.current();
				releaseSuppressRef.current = null;
			}

			const scrollTarget = bindScrollListener();

			releaseSuppressRef.current = runAfterReportScrollSettles(
				scrollTarget,
				() => {
					suppressSpyRef.current = false;
					releaseSuppressRef.current = null;
					updateActiveFromScroll();
				},
			);
		},
		[bindScrollListener, updateActiveFromScroll],
	);

	useEffect(() => {
		const handleResize = () => {
			bindScrollListener();
			updateActiveFromScroll();
		};

		bindScrollListener();
		updateActiveFromScroll();

		window.addEventListener("resize", handleResize, { passive: true });

		const mutationObserver = new MutationObserver(() => {
			if (suppressSpyRef.current) {
				return;
			}
			bindScrollListener();
			updateActiveFromScroll();
		});
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});

		return () => {
			const handleScroll = handleScrollRef.current;
			if (scrollTargetRef.current && handleScroll) {
				scrollTargetRef.current.removeEventListener("scroll", handleScroll);
				scrollTargetRef.current = null;
			}
			window.removeEventListener("resize", handleResize);
			mutationObserver.disconnect();
			if (releaseSuppressRef.current) {
				releaseSuppressRef.current();
			}
		};
	}, [bindScrollListener, updateActiveFromScroll]);

	const handleNavClick = useCallback(
		(navId: AssessmentReportResultsNavId, targetSectionId: string) => {
			setActiveFromNavClick(navId);
			scrollReportSectionIntoView(targetSectionId);
		},
		[setActiveFromNavClick],
	);

	return (
		<nav
			className={navStyles.listClassName}
			aria-label={ASSESSMENT_REPORT_RESULTS_PAGE.reportSectionsNavLabel}
		>
			{ASSESSMENT_REPORT_RESULTS_NAV.map((item) => {
				const isActive = item.id === activeId;
				return (
					<button
						key={item.id}
						type="button"
						tabIndex={0}
						aria-current={isActive ? "true" : undefined}
						aria-label={item.label}
						className={cn(
							navStyles.itemBaseClassName,
							navStyles.itemImplementedClassName,
							isActive
								? navStyles.itemActiveClassName
								: navStyles.itemInactiveClassName,
						)}
						onClick={() => handleNavClick(item.id, item.targetSectionId)}
					>
						{item.label}
					</button>
				);
			})}
		</nav>
	);
}
