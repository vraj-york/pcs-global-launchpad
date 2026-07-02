import { useEffect, useRef, useState } from "react";
import {
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { FormStepSkeleton, Stepper, WhiteBox } from "@/components";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	ADD_NEW_COMPANY_CONTENT,
	ADD_NEW_COMPANY_STEPS,
	HTTP_STATUS,
	ROUTES,
} from "@/const";
import { useCompanyDirectoryStore } from "@/store";
import {
	ADD_COMPANY_STEP_CONTENT,
	BasicInfoStep,
	CompanyConfirmationStep,
	ConfigurationStep,
	KeyContactsStep,
	PlanAndSeatsStep,
} from "./add-company-steps";

export function AddCompanyContent() {
	const navigate = useNavigate();
	const { companyId } = useParams<{ companyId?: string }>();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const isResumeFlow =
		searchParams.get("flow") === "edit" &&
		typeof location.state?.editStep === "number";
	const {
		companyActionLoading,
		fetchCompanyById,
		clearCompanyDetail,
		companyDetail,
		companyDetailLoading,
		companyDetailErrorStatus,
		reset,
		submitCompanyConfirmation,
	} = useCompanyDirectoryStore();
	const lastFetchedStepRef = useRef<number | null>(null);
	const lastFetchedCompanyIdRef = useRef<string | null>(null);
	const wizardStepInitializedRef = useRef(false);
	const submittingConfirmationRef = useRef(false);

	const totalSteps = ADD_NEW_COMPANY_STEPS.length;
	const initialStepFromState = isResumeFlow
		? Math.min(Math.max(0, location.state.editStep as number), totalSteps - 1)
		: 0;

	const [currentStep, setCurrentStep] = useState(initialStepFromState);
	const [entryStepResolved, setEntryStepResolved] = useState(
		() => !companyId || initialStepFromState !== 0,
	);

	useEffect(() => {
		if (!companyId) {
			clearCompanyDetail();
		}
	}, [companyId, clearCompanyDetail]);

	useEffect(() => {
		if (companyId && companyDetail?.id !== companyId) {
			clearCompanyDetail();
		}
	}, [companyId, companyDetail?.id, clearCompanyDetail]);

	useEffect(() => {
		lastFetchedStepRef.current = null;
		lastFetchedCompanyIdRef.current = null;
		wizardStepInitializedRef.current = false;
	}, [companyId]);

	useEffect(() => {
		if (!companyId) {
			setEntryStepResolved(true);
			setCurrentStep(0);
			return;
		}
		if (
			lastFetchedStepRef.current === currentStep &&
			lastFetchedCompanyIdRef.current === companyId
		) {
			return;
		}
		lastFetchedStepRef.current = currentStep;
		lastFetchedCompanyIdRef.current = companyId;
		fetchCompanyById(companyId);
	}, [companyId, currentStep, fetchCompanyById]);

	useEffect(() => {
		if (companyDetailErrorStatus === HTTP_STATUS.NOT_FOUND) {
			clearCompanyDetail();
			navigate(ROUTES.companyDirectory.root);
		}
	}, [companyDetailErrorStatus, clearCompanyDetail, navigate]);

	useEffect(() => {
		if (!companyId) return;
		if (searchParams.get("flow") !== "edit") return;
		if (typeof location.state?.editStep === "number") return;
		if (companyDetailLoading || companyDetail?.id !== companyId) return;
		if (companyDetail?.status?.toLowerCase() === "incomplete") return;
		navigate(ROUTES.companyDirectory.viewWithIdPath(companyId), {
			state: { flow: "edit" },
			replace: true,
		});
	}, [
		companyId,
		companyDetail?.id,
		companyDetail?.status,
		companyDetailLoading,
		location.state?.editStep,
		navigate,
		searchParams,
	]);

	useEffect(() => {
		if (!companyId) {
			setEntryStepResolved(true);
			setCurrentStep(0);
			return;
		}

		if (wizardStepInitializedRef.current) {
			return;
		}

		if (isResumeFlow) {
			const step = Math.min(
				Math.max(0, location.state.editStep as number),
				totalSteps - 1,
			);
			setCurrentStep(step);
			setEntryStepResolved(true);
			wizardStepInitializedRef.current = true;
			return;
		}

		if (companyDetailLoading) return;
		if (companyDetail?.id !== companyId) {
			setEntryStepResolved(true);
			return;
		}

		const submitted = companyDetail.submittedSteps ?? 0;
		setCurrentStep(Math.min(Math.max(0, submitted), totalSteps - 1));
		setEntryStepResolved(true);
		wizardStepInitializedRef.current = true;
	}, [
		companyId,
		companyDetailLoading,
		companyDetail?.id,
		companyDetail?.submittedSteps,
		isResumeFlow,
		location.state?.editStep,
		totalSteps,
	]);

	const isNextButtonLoading = companyActionLoading;
	const isEntryStepPending = Boolean(companyId) && !entryStepResolved;

	const progress =
		totalSteps <= 1 ? 0 : Math.round((currentStep / (totalSteps - 1)) * 100);
	const stepConfig = ADD_COMPANY_STEP_CONTENT[currentStep];

	const handleCancel = () => {
		reset();
		navigate(ROUTES.companyDirectory.root);
	};

	const handlePrevious = () => {
		if (currentStep > 0) setCurrentStep((s) => s - 1);
	};

	const handleNext = () => {
		if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
	};

	const handleBasicInfoSuccess = (id: string) => {
		navigate(ROUTES.companyDirectory.addWithIdPath(id));
		setCurrentStep(1);
	};

	const handleKeyContactsSuccess = () => {
		setCurrentStep(2);
	};

	const handlePlanSeatsSuccess = () => {
		setCurrentStep(3);
	};

	const handleConfigurationSuccess = () => {
		setCurrentStep(4);
	};

	const handleConfirmAdd = async () => {
		if (!companyId || submittingConfirmationRef.current) return;
		submittingConfirmationRef.current = true;
		try {
			const result = await submitCompanyConfirmation(companyId);
			if (result.ok) {
				toast.success(ADD_NEW_COMPANY_CONTENT.toast.companyCreated);
				reset();
				navigate(ROUTES.companyDirectory.root);
			}
		} finally {
			submittingConfirmationRef.current = false;
		}
	};

	const nextButtonForm =
		currentStep === 0
			? "add-company-basic-info-form"
			: currentStep === 1
				? "add-company-key-contacts-form"
				: currentStep === 2
					? "add-company-plan-seats-form"
					: currentStep === 3
						? "add-company-configuration-form"
						: undefined;
	const isNextSubmit =
		currentStep === 0 ||
		currentStep === 1 ||
		currentStep === 2 ||
		currentStep === 3;

	const renderStep = () => {
		if (currentStep === 0) {
			return (
				<BasicInfoStep
					onSuccess={handleBasicInfoSuccess}
					companyId={companyId ?? null}
				/>
			);
		}
		if (currentStep === 1) {
			return (
				<KeyContactsStep
					companyId={companyId ?? null}
					onSuccess={handleKeyContactsSuccess}
				/>
			);
		}
		if (currentStep === 2) {
			return (
				<PlanAndSeatsStep
					companyId={companyId ?? null}
					onSuccess={handlePlanSeatsSuccess}
				/>
			);
		}
		if (currentStep === 3) {
			return (
				<ConfigurationStep
					companyId={companyId ?? null}
					onSuccess={handleConfigurationSuccess}
				/>
			);
		}
		if (currentStep === totalSteps - 1) {
			return <CompanyConfirmationStep />;
		}
	};

	return (
		<div className="space-y-6 overflow-x-hidden">
			<div className="flex-1">
				<h1 className="text-heading-5 font-semibold text-text-foreground">
					{ADD_NEW_COMPANY_CONTENT.pageTitle}
				</h1>
				<p className="mt-1 text-sm text-text-secondary">
					{ADD_NEW_COMPANY_CONTENT.pageSubtitle}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-stretch">
				<WhiteBox
					padding="md"
					className="h-full min-h-0 max-h-[calc(100vh-12rem)]"
				>
					<Stepper
						steps={ADD_NEW_COMPANY_STEPS.map((s) => ({
							id: s.id,
							title: s.title,
							subtitle: s.subtitle,
						}))}
						activeStep={currentStep}
					/>
				</WhiteBox>

				<WhiteBox
					padding="md"
					className="relative flex min-h-0 flex-col max-h-[calc(100vh-12rem)] overflow-hidden"
				>
					<div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
						<div className="sticky top-0 z-10 -mx-6 -mt-6 flex flex-col gap-4 bg-background px-6 pb-4">
							<div className="text-sm font-medium text-text-foreground">
								{progress}% {ADD_NEW_COMPANY_CONTENT.progress}
							</div>
							<div className="h-2 w-full rounded-full bg-muted">
								<div
									className="h-2 rounded-full bg-primary transition-[width]"
									style={{ width: `${progress}%` }}
									aria-hidden
								/>
							</div>
						</div>

						<div className="flex min-h-0 flex-1 flex-col">
							<div className="flex flex-col gap-6 pt-6">
								{!entryStepResolved && companyId ? (
									<FormStepSkeleton fieldCount={10} />
								) : (
									<>
										<div>
											<h2 className="text-heading-4 font-semibold text-text-foreground">
												{stepConfig.title}
											</h2>
											<p className="mt-2 text-sm text-muted-foreground">
												{stepConfig.subtitle}
											</p>
										</div>
										{renderStep()}
									</>
								)}
							</div>
							<div className="-mx-8 mt-auto shrink-0 pt-5">
								<Separator />
								<div className="flex flex-wrap items-center justify-between px-8 pt-4">
									<Button
										variant="outline"
										onClick={handleCancel}
										className="border-border text-text-foreground"
									>
										{ADD_NEW_COMPANY_CONTENT.buttons.cancel}
									</Button>

									<div className="flex items-center gap-2">
										<Button
											variant="secondary"
											onClick={handlePrevious}
											disabled={
												currentStep === 0 ||
												isNextButtonLoading ||
												isEntryStepPending
											}
											className="bg-muted text-text-foreground"
										>
											{ADD_NEW_COMPANY_CONTENT.buttons.previous}
										</Button>
										<Button
											type={isNextSubmit ? "submit" : "button"}
											form={nextButtonForm}
											onClick={
												isNextSubmit
													? undefined
													: currentStep >= totalSteps - 1
														? handleConfirmAdd
														: handleNext
											}
											disabled={isEntryStepPending}
											isLoading={isNextButtonLoading}
										>
											{currentStep >= totalSteps - 1
												? ADD_NEW_COMPANY_CONTENT.buttons.confirmAdd
												: ADD_NEW_COMPANY_CONTENT.buttons.next}
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</WhiteBox>
			</div>
		</div>
	);
}
