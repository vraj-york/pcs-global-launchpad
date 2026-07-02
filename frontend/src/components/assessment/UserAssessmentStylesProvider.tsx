import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUserAssessmentStyles } from "@/api";
import { isApiError } from "@/lib";
import type {
	ApiUserAssessmentStylesResponse,
	AssessmentReportSectionLoadState,
	UserAssessmentStylesContextValue,
	UserAssessmentStylesProviderProps,
} from "@/types";

const UserAssessmentStylesContext =
	createContext<UserAssessmentStylesContextValue | null>(null);

export function useUserAssessmentStylesContext(): UserAssessmentStylesContextValue {
	const ctx = useContext(UserAssessmentStylesContext);
	if (!ctx) {
		throw new Error(
			"useUserAssessmentStylesContext must be used within UserAssessmentStylesProvider",
		);
	}
	return ctx;
}

export function UserAssessmentStylesProvider({
	assessmentId,
	enabled = true,
	children,
}: UserAssessmentStylesProviderProps) {
	const [loadState, setLoadState] =
		useState<AssessmentReportSectionLoadState>("idle");
	const [styles, setStyles] = useState<ApiUserAssessmentStylesResponse | null>(
		null,
	);

	useEffect(() => {
		if (!enabled || !assessmentId.trim()) {
			setLoadState("idle");
			setStyles(null);
			return;
		}
		let cancelled = false;
		setLoadState("loading");
		void (async () => {
			const res = await getUserAssessmentStyles(assessmentId);
			if (cancelled) {
				return;
			}
			if (isApiError(res)) {
				setStyles(null);
				setLoadState("error");
				return;
			}
			setStyles(res.data);
			setLoadState("ok");
		})();
		return () => {
			cancelled = true;
		};
	}, [assessmentId, enabled]);

	const value = useMemo(
		() => ({
			loadState,
			styles,
		}),
		[loadState, styles],
	);

	return (
		<UserAssessmentStylesContext.Provider value={value}>
			{children}
		</UserAssessmentStylesContext.Provider>
	);
}
