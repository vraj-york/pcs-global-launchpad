import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { shareAssessmentReport } from "@/api";
import {
	AssessmentReportPrintShell,
	ShareAssessmentReportModal,
} from "@/components";
import { ASSESSMENT_REPORT_SHARE } from "@/const";
import type { AssessmentReportPrintRouteParams } from "@/types";

export function AssessmentReportPrintPage() {
	const { assessmentId } = useParams<AssessmentReportPrintRouteParams>();
	const safeId = assessmentId?.trim() ?? "";
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [isSharing, setIsSharing] = useState(false);

	const handleOpenShareModal = useCallback(() => {
		setShareModalOpen(true);
	}, []);

	const handleShareModalOpenChange = useCallback((open: boolean) => {
		setShareModalOpen(open);
	}, []);

	const handleShareReportConfirm = useCallback(
		async (recipients: string[]) => {
			if (recipients.length === 0) {
				toast.error(ASSESSMENT_REPORT_SHARE.noRecipients);
				return;
			}
			if (!safeId) {
				return;
			}
			setIsSharing(true);
			try {
				const res = await shareAssessmentReport(safeId, recipients);
				if (!res.ok) {
					toast.error(res.message || ASSESSMENT_REPORT_SHARE.shareFailed);
					return;
				}
				toast.success(ASSESSMENT_REPORT_SHARE.success);
				setShareModalOpen(false);
			} catch {
				toast.error(ASSESSMENT_REPORT_SHARE.shareFailed);
			} finally {
				setIsSharing(false);
			}
		},
		[safeId],
	);

	if (!safeId) {
		return null;
	}

	return (
		<>
			<AssessmentReportPrintShell
				assessmentId={safeId}
				mode="preview"
				onShare={handleOpenShareModal}
			/>
			<ShareAssessmentReportModal
				open={shareModalOpen}
				onOpenChange={handleShareModalOpenChange}
				onShare={handleShareReportConfirm}
				isSharing={isSharing}
			/>
		</>
	);
}
