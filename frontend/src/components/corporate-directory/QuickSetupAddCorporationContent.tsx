import { Zap } from "lucide-react";
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
	ADD_NEW_CORPORATION_CONTENT,
	ADD_NEW_CORPORATION_STEPS,
	HTTP_STATUS,
	ROUTES,
} from "@/const";
import { useCorporationsStore } from "@/store";
import {
	ADD_CORPORATION_STEP_CONTENT,
	BasicInfoStep,
	CompanyInfoStep,
	ConfirmationStep,
} from "./add-corporation-steps";

export function QuickSetupAddCorporationContent() {
	const { corporationId: corporationIdParam } = useParams<{
		corporationId?: string;
	}>();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const totalSteps = ADD_NEW_CORPORATION_STEPS.length;
	const initialStepFromState =
		searchParams.get("flow") === "edit" &&
		typeof location.state?.editStep === "number"
			? Math.min(Math.max(0, location.state.editStep), totalSteps - 1)
			: 0;
	const [currentStep, setCurrentStep] = useState(initialStepFromState);
	const lastFetchedStepRef = useRef<number | null>(null);
	const lastFetchedCorpIdRef = useRef<string | null>(null);
	const isEditMode = searchParams.get("flow") === "edit";
	const {
		clearError,
		clearCorporationDetail,
		isLoading,
		companyActionLoading,
		reset,
		fetchCorporationById,
		corporationDetail,
		corporationDetailLoading,
		corporationDetailErrorStatus,
		submitStep,
	} = useCorporationsStore();

	const isNextButtonLoading = isLoading || companyActionLoading;

	const navigate = useNavigate();
	const progress =
		totalSteps <= 1 ? 0 : Math.round((currentStep / (totalSteps - 1)) * 100);
	const stepConfig = ADD_CORPORATION_STEP_CONTENT[currentStep];

	useEffect(() => {
		if (corporationIdParam) {
			useCorporationsStore.setState({ corporationId: corporationIdParam });
		} else {
			clearCorporationDetail();
			useCorporationsStore.setState({ corporationId: null });
		}
	}, [corporationIdParam, clearCorporationDetail]);

	useEffect(() => {
		if (corporationIdParam && corporationDetail?.id !== corporationIdParam) {
			clearCorporationDetail();
		}
	}, [corporationIdParam, corporationDetail?.id, clearCorporationDetail]);

	useEffect(() => {
		if (!corporationIdParam) return;
		if (
			lastFetchedStepRef.current === currentStep &&
			lastFetchedCorpIdRef.current === corporationIdParam
		) {
			return;
		}
		lastFetchedStepRef.current = currentStep;
		lastFetchedCorpIdRef.current = corporationIdParam;
		fetchCorporationById(corporationIdParam);
	}, [corporationIdParam, currentStep, fetchCorporationById]);

	useEffect(() => {
		if (corporationDetailErrorStatus === HTTP_STATUS.NOT_FOUND) {
			clearCorporationDetail();
			navigate(ROUTES.corporateDirectory.root);
		}
	}, [corporationDetailErrorStatus, clearCorporationDetail, navigate]);

	const handleCancel = () => {
		reset();
		navigate(ROUTES.corporateDirectory.root);
	};

	const handlePrevious = () => {
		clearError();
		if (currentStep > 0) setCurrentStep((s) => s - 1);
	};

	const handleNext = () => {
		clearError();
		if (currentStep < totalSteps - 1) {
			setCurrentStep((s) => s + 1);
		}
	};

	const handleConfirmAdd = async () => {
		clearError();
		const result = await submitStep("confirmation");
		if (result.ok) {
			if (isEditMode) {
				toast.success(ADD_NEW_CORPORATION_CONTENT.toast.corporationUpdated);
			} else {
				toast.success(ADD_NEW_CORPORATION_CONTENT.toast.corporationCreated);
			}
			reset();
			navigate(ROUTES.corporateDirectory.root);
		}
	};

	const nextButtonForm =
		currentStep === 0
			? "basic-info-form"
			: currentStep === 1
				? "company-info-form"
				: undefined;
	const isNextSubmit = currentStep <= 1;

	const handleBasicInfoSuccess = (id: string) => {
		clearError();
		const flow = isEditMode ? "edit" : "create";
		navigate(`${ROUTES.corporateDirectory.addWithIdPath(id)}?flow=${flow}`);
		setCurrentStep(1);
	};

	const handleCompanyInfoSuccess = () => {
		clearError();
		setCurrentStep(2);
	};

	const renderStep = () => {
		if (corporationDetailLoading) {
			return <FormStepSkeleton fieldCount={10} />;
		}
		if (currentStep === 0) {
			return (
				<BasicInfoStep
					onSuccess={handleBasicInfoSuccess}
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
				/>
			);
		}
		if (currentStep === 1) {
			return (
				<CompanyInfoStep
					onSuccess={handleCompanyInfoSuccess}
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
				/>
			);
		}
		return (
			<ConfirmationStep
				corporationDetail={corporationDetail}
				isLoadingDetail={corporationDetailLoading}
				flow="quick"
			/>
		);
	};

	return (
		<div className="space-y-6 overflow-x-hidden">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1">
					<h1 className="text-heading-5 font-semibold text-text-foreground">
						{isEditMode
							? ADD_NEW_CORPORATION_CONTENT.editPageTitle
							: ADD_NEW_CORPORATION_CONTENT.pageTitle}
					</h1>
					<p className="text-sm text-text-secondary mt-1">
						{isEditMode
							? ADD_NEW_CORPORATION_CONTENT.editPageSubtitle
							: ADD_NEW_CORPORATION_CONTENT.pageSubtitle}
					</p>
				</div>
				<div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card border border-border">
					<Zap className="size-4 text-icon-info fill-icon-info" />
					<span className="text-sm font-semibold text-text-foreground">
						{ADD_NEW_CORPORATION_CONTENT.setupBadge.quick}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-stretch">
				<WhiteBox
					padding="md"
					className="h-full min-h-0 max-h-[calc(100vh-12rem)]"
				>
					<Stepper
						steps={ADD_NEW_CORPORATION_STEPS.map((s) => ({
							id: s.id,
							title: s.title,
							subtitle: s.subtitle,
						}))}
						activeStep={currentStep}
					/>
				</WhiteBox>

				<WhiteBox
					padding="md"
					className="relative flex flex-col min-h-0 max-h-[calc(100vh-12rem)] overflow-hidden"
				>
					<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
						<div className="sticky top-0 z-10 flex flex-col gap-4 bg-background pb-4 -mx-6 px-6 -mt-6">
							<div className="text-sm text-text-foreground font-medium">
								{progress}% {ADD_NEW_CORPORATION_CONTENT.progress}
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
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{stepConfig.title}
									</h2>
									<p className="text-sm text-muted-foreground mt-2">
										{stepConfig.subtitle}
									</p>
								</div>
								{renderStep()}
							</div>
							<div className="mt-auto shrink-0 -mx-8 pt-5">
								<Separator />
								<div className="flex flex-wrap items-center justify-between px-8 pt-4">
									<Button
										variant="outline"
										onClick={handleCancel}
										className="border-border text-text-foreground"
									>
										{ADD_NEW_CORPORATION_CONTENT.buttons.cancel}
									</Button>

									<div className="flex items-center gap-2">
										<Button
											variant="secondary"
											onClick={handlePrevious}
											disabled={currentStep === 0 || isNextButtonLoading}
											className="bg-muted text-text-foreground"
										>
											{ADD_NEW_CORPORATION_CONTENT.buttons.previous}
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
											isLoading={isNextButtonLoading}
										>
											{currentStep >= totalSteps - 1
												? isEditMode
													? ADD_NEW_CORPORATION_CONTENT.buttons.confirmUpdate
													: ADD_NEW_CORPORATION_CONTENT.buttons.confirmAdd
												: ADD_NEW_CORPORATION_CONTENT.buttons.next}
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
