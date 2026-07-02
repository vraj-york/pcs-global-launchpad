import { SlidersVertical } from "lucide-react";
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
	ADD_NEW_CORPORATION_STEPS_ADVANCED,
	HTTP_STATUS,
	ROUTES,
} from "@/const";
import { useCorporationsStore } from "@/store";
import {
	ADD_CORPORATION_STEP_CONTENT_ADVANCED,
	BasicInfoStep,
	BrandingStep,
	CompanySetupStep,
	ConfirmationStep,
	KeyContactsStep,
} from "./add-corporation-steps";

export function AdvancedSetupAddCorporationContent() {
	const { corporationId: corporationIdParam } = useParams<{
		corporationId?: string;
	}>();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const totalSteps = ADD_NEW_CORPORATION_STEPS_ADVANCED.length;
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
		deleteCompany,
		isLoading,
		reset,
		fetchCorporationById,
		corporationDetail,
		corporationDetailLoading,
		corporationDetailErrorStatus,
		corporationId,
		submitStep,
	} = useCorporationsStore();

	const submittingRef = useRef(false);

	const navigate = useNavigate();
	const progress =
		totalSteps <= 1 ? 0 : Math.round((currentStep / (totalSteps - 1)) * 100);
	const stepConfig = ADD_CORPORATION_STEP_CONTENT_ADVANCED[currentStep];

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

	const handleNext = async () => {
		clearError();
		const companySetupStepIndex = 1;
		const brandingStepIndex = 2;
		if (
			currentStep === companySetupStepIndex &&
			(corporationDetail?.companies?.length ?? 0) < 1
		) {
			toast.error(
				ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup
					.addOneCompanyRequired,
			);
			return;
		}
		if (currentStep === companySetupStepIndex) {
			const result = await submitStep("company");
			if (!result.ok) return;
		}
		if (currentStep === brandingStepIndex) {
			const result = await submitStep("branding");
			if (!result.ok) return;
		}
		if (currentStep < totalSteps - 1) {
			setCurrentStep((s) => s + 1);
		}
	};

	const handleConfirmAdd = async () => {
		if (submittingRef.current) return;
		clearError();
		submittingRef.current = true;
		try {
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
		} finally {
			submittingRef.current = false;
		}
	};

	const nextButtonForm =
		currentStep === 0
			? "basic-info-form"
			: currentStep === 3
				? "key-contacts-form"
				: undefined;
	const isNextSubmit = currentStep === 0 || currentStep === 3;

	const handleBasicInfoSuccess = (id: string) => {
		clearError();
		const flow = isEditMode ? "edit" : "create";
		navigate(
			`${ROUTES.corporateDirectory.addAdvancedWithIdPath(id)}?flow=${flow}`,
		);
		setCurrentStep(1);
	};

	const handleKeyContactsSuccess = () => {
		clearError();
		setCurrentStep(4);
	};

	const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(
		null,
	);
	const [isCompanyFormPanelOpen, setIsCompanyFormPanelOpen] = useState(false);

	useEffect(() => {
		if (currentStep !== 1) setIsCompanyFormPanelOpen(false);
	}, [currentStep]);

	const handleDeleteCompany = async (companyId: string) => {
		const corporationId = corporationDetail?.id;
		if (!corporationId) return;
		setDeletingCompanyId(companyId);
		try {
			await deleteCompany(corporationId, companyId);
		} finally {
			setDeletingCompanyId(null);
		}
	};

	const renderStep = () => {
		if (corporationDetailLoading) {
			return <FormStepSkeleton fieldCount={10} />;
		}

		if (currentStep === 0) {
			return (
				<BasicInfoStep
					mode="advanced"
					onSuccess={handleBasicInfoSuccess}
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
				/>
			);
		}

		if (currentStep === 1) {
			return (
				<CompanySetupStep
					corporationDetail={corporationDetail}
					onDeleteCompany={handleDeleteCompany}
					deletingCompanyId={deletingCompanyId}
					isLoadingCompanies={corporationDetailLoading}
					onFormPanelOpenChange={setIsCompanyFormPanelOpen}
				/>
			);
		}

		if (currentStep === 2) {
			const corpId = corporationIdParam ?? corporationId ?? "";
			return corpId ? (
				<BrandingStep
					corporationId={corpId}
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
				/>
			) : (
				<p className="text-small text-muted-foreground">
					{ADD_NEW_CORPORATION_CONTENT.loadingDetail}
				</p>
			);
		}
		if (currentStep === 3) {
			return (
				<KeyContactsStep
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
					onSuccess={handleKeyContactsSuccess}
				/>
			);
		}
		if (currentStep === totalSteps - 1) {
			return (
				<ConfirmationStep
					corporationDetail={corporationDetail}
					isLoadingDetail={corporationDetailLoading}
					flow="advanced"
				/>
			);
		}
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
							: ADD_NEW_CORPORATION_CONTENT.advancedPageSubtitle}
					</p>
				</div>
				<div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card border border-border">
					<SlidersVertical className="size-4 text-icon-info fill-icon-info" />
					<span className="text-sm font-semibold text-text-foreground">
						{ADD_NEW_CORPORATION_CONTENT.setupBadge.advanced}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 lg:items-stretch">
				<WhiteBox
					padding="md"
					className="h-full min-h-0 max-h-[calc(100vh-12rem)]"
				>
					<Stepper
						steps={ADD_NEW_CORPORATION_STEPS_ADVANCED.map((s) => ({
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
							{!(currentStep === 1 && isCompanyFormPanelOpen) && (
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
												disabled={currentStep === 0 || isLoading}
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
												disabled={submittingRef.current}
												isLoading={isLoading}
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
							)}
						</div>
					</div>
				</WhiteBox>
			</div>
		</div>
	);
}
