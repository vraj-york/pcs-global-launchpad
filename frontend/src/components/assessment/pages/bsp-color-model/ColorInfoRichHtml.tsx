import { cn } from "@/lib/utils";
import type { AssessmentReportRichHtmlProps } from "@/types";
import { sanitizeAssessmentReportHtml } from "@/utils";

export function ColorInfoRichHtml({
	html,
	className,
	scopeClassName,
}: AssessmentReportRichHtmlProps) {
	const safe = sanitizeAssessmentReportHtml(html);
	if (!safe.trim()) {
		return null;
	}
	return (
		<div
			className={cn(scopeClassName, className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized CMS HTML from report_content.
			dangerouslySetInnerHTML={{ __html: safe }}
		/>
	);
}
