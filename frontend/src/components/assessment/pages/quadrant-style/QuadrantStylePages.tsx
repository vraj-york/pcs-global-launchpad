import { useEffect } from "react";
import { toast } from "sonner";
import {
	AssessmentReportSection,
	useUserAssessmentStylesContext,
} from "@/components";
import {
	ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS,
	ASSESSMENT_REPORT_QUADRANT_STYLE_SECTION_KEYS,
} from "@/const";
import { ContextStyleSection } from "./ContextStyleSection";

export function QuadrantStylePages() {
	const { loadState, styles } = useUserAssessmentStylesContext();

	useEffect(() => {
		if (loadState === "error") {
			toast.error(
				ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS.professional_typical.loadError,
			);
		}
	}, [loadState]);

	if (loadState === "error" || (loadState === "ok" && !styles)) {
		return (
			<>
				{ASSESSMENT_REPORT_QUADRANT_STYLE_SECTION_KEYS.map((contextKey) => {
					const copy = ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS[contextKey];
					return (
						<AssessmentReportSection
							key={contextKey}
							id={copy.sectionId}
							errorTitle={copy.loadErrorTitle}
							errorBody={copy.loadErrorBody}
							loadState="error"
						/>
					);
				})}
			</>
		);
	}

	if (loadState === "loading" || loadState === "idle" || !styles) {
		return (
			<>
				{ASSESSMENT_REPORT_QUADRANT_STYLE_SECTION_KEYS.map((contextKey) => {
					const copy = ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS[contextKey];
					return (
						<AssessmentReportSection
							key={contextKey}
							id={copy.sectionId}
							loadState="loading"
						/>
					);
				})}
			</>
		);
	}

	return (
		<>
			{ASSESSMENT_REPORT_QUADRANT_STYLE_SECTION_KEYS.map((contextKey) => (
				<ContextStyleSection
					key={contextKey}
					contextKey={contextKey}
					styles={styles}
				/>
			))}
		</>
	);
}
