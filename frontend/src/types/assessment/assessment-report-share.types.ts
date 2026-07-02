import type { ShareAssessmentReportFormValues } from "@/schemas";

export type { ShareAssessmentReportFormValues };

export type ShareAssessmentReportModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onShare: (recipients: string[]) => Promise<void>;
	isSharing: boolean;
};
