import { Fragment } from "react";
import { ASSESSMENT_REPORT_ADAPTARIAN } from "@/const";

const colorClass: Record<
	(typeof ASSESSMENT_REPORT_ADAPTARIAN.colorStripParts)[number],
	string
> = {
	GRAY: "text-icon-primary",
	RED: "text-brand-red",
	GREEN: "text-brand-green",
};

export function AssessmentReportAdaptarianColorStrip() {
	const parts = ASSESSMENT_REPORT_ADAPTARIAN.colorStripParts;

	return (
		<p className="text-center text-heading-4 font-semibold leading-heading-4">
			{parts.map((part, i) => (
				<Fragment key={part}>
					{i > 0 ? (
						<span className="font-medium text-muted-foreground"> / </span>
					) : null}
					<span className={colorClass[part]}>{part}</span>
				</Fragment>
			))}
		</p>
	);
}
