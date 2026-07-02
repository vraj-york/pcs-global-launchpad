import { CirclePlay, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentDirectoryContent } from "@/components";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ASSESSMENTS_DIRECTORY_PAGE_CONTENT,
	ROUTES,
	SUBMODULE_KEYS,
	SUBSCRIPTION_ACCESS_CONTENT,
} from "@/const";
import { usePermissions, useSubscriptionAccess } from "@/hooks";
import { AppLayout } from "@/layout";
import { useAssessmentDirectoryStore } from "@/store";

export function AssessmentsDirectoryPage() {
	const navigate = useNavigate();
	const { can } = usePermissions();
	const canTakeAssessment = can(SUBMODULE_KEYS.ASSESSMENT_TAKE);
	const { canStartAssessment, loading: subscriptionLoading } =
		useSubscriptionAccess();
	const { setListCognitoSub } = useAssessmentDirectoryStore();
	const { listItems, listLoading } = useAssessmentDirectoryStore();
	const [hasResolvedPrimaryAction, setHasResolvedPrimaryAction] =
		useState(false);
	const hasSeenListLoadingRef = useRef(false);

	useEffect(() => {
		setListCognitoSub(undefined);
		setHasResolvedPrimaryAction(false);
		hasSeenListLoadingRef.current = false;
	}, [setListCognitoSub]);

	useEffect(() => {
		if (listLoading) {
			hasSeenListLoadingRef.current = true;
			return;
		}
		if (hasSeenListLoadingRef.current) {
			setHasResolvedPrimaryAction(true);
		}
	}, [listLoading]);

	const incompleteAssessment = useMemo(
		() => listItems.find((item) => item.status === "incomplete"),
		[listItems],
	);

	const breadcrumbs = [
		{
			label: ASSESSMENTS_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.assessments.root,
		},
	];

	const handlePrimaryAssessmentAction = useCallback(() => {
		if (!canStartAssessment) {
			return;
		}
		if (incompleteAssessment) {
			navigate(ROUTES.assessment.root, {
				state: { reviewAssessmentId: incompleteAssessment.id },
			});
			return;
		}
		navigate(ROUTES.assessment.introEntry);
	}, [navigate, incompleteAssessment, canStartAssessment]);

	const primaryActionLabel = incompleteAssessment
		? ASSESSMENTS_DIRECTORY_PAGE_CONTENT.resumeAssessmentButton
		: ASSESSMENTS_DIRECTORY_PAGE_CONTENT.takeAssessmentButton;
	const primaryActionAriaLabel = incompleteAssessment
		? ASSESSMENTS_DIRECTORY_PAGE_CONTENT.resumeAssessmentAriaLabel
		: ASSESSMENTS_DIRECTORY_PAGE_CONTENT.takeAssessmentAriaLabel;
	const PrimaryActionIcon = incompleteAssessment ? CirclePlay : ClipboardList;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{ASSESSMENTS_DIRECTORY_PAGE_CONTENT.title}
					</h1>
					<p className="text-small text-text-secondary">
						{ASSESSMENTS_DIRECTORY_PAGE_CONTENT.subtitle}
					</p>
				</div>
				{canTakeAssessment &&
					(!hasResolvedPrimaryAction || subscriptionLoading ? (
						<Button
							type="button"
							disabled
							isLoading
							aria-label={
								ASSESSMENTS_DIRECTORY_PAGE_CONTENT.primaryActionLoadingAriaLabel
							}
							className="min-w-44"
						/>
					) : !canStartAssessment ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex">
									<Button
										type="button"
										disabled
										icon={PrimaryActionIcon}
										aria-label={
											SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip
										}
										className="min-w-44"
									>
										{primaryActionLabel}
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="top">
								{SUBSCRIPTION_ACCESS_CONTENT.takeAssessmentDisabledTooltip}
							</TooltipContent>
						</Tooltip>
					) : (
						<Button
							type="button"
							onClick={handlePrimaryAssessmentAction}
							aria-label={primaryActionAriaLabel}
							icon={PrimaryActionIcon}
							className="min-w-44"
						>
							{primaryActionLabel}
						</Button>
					))}
			</div>
			<AssessmentDirectoryContent />
		</AppLayout>
	);
}
