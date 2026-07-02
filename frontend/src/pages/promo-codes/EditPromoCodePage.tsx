import { yupResolver } from "@hookform/resolvers/yup";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
	deletePromoCode,
	getActiveCompanies,
	getCorporationsList,
	getPricingPlans,
	getPromoCodeById,
	patchPromoCodePromotionActive,
	patchUpdatePromoCode,
	postValidatePromoCodeUpdate,
} from "@/api";
import {
	AppLoader,
	ConfirmationModal,
	PromoCodeFormAssignmentFields,
	PromoCodeFormCollapsibleSection,
	PromoCodeFormInfoFields,
	PromoCodeFormValidationFooter,
	PromoCodePromotionEnableWarning,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PROMO_CODES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { AddPromoCodeFormShell } from "@/pages";
import {
	type CreatePromoCodeFormValues,
	createPromoCodeFormDefaultValues,
	createPromoCodeSchema,
} from "@/schemas";
import type {
	ActiveCompanyListItem,
	CorporationListOption,
	PricingPlanType,
	PromoCodeDetailData,
} from "@/types";
import {
	buildUpdatePayloadFromForm,
	getPromoExpiryMinDateIso,
	updatePromoCodePayloadSnapshot,
} from "@/utils";

const C = PROMO_CODES_PAGE_CONTENT;

export function EditPromoCodePage() {
	const { promoCodeId } = useParams<{ promoCodeId: string }>();
	const navigate = useNavigate();
	const breadcrumbs = [
		{ label: C.breadcrumbManagement, path: ROUTES.promoCodes.root },
		...(promoCodeId
			? [
					{
						label: C.edit.breadcrumb,
						path: ROUTES.promoCodes.editWithIdPath(promoCodeId),
					},
				]
			: []),
	];

	const [planTypes, setPlanTypes] = useState<PricingPlanType[]>([]);
	const [plansLoading, setPlansLoading] = useState(true);
	const [corporations, setCorporations] = useState<CorporationListOption[]>([]);
	const [corpsLoading, setCorpsLoading] = useState(true);
	const [activeCompanies, setActiveCompanies] = useState<
		ActiveCompanyListItem[]
	>([]);
	const [activeCompaniesLoading, setActiveCompaniesLoading] = useState(true);

	const [detail, setDetail] = useState<PromoCodeDetailData | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [detailLoading, setDetailLoading] = useState(true);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteInProgress, setDeleteInProgress] = useState(false);
	const [promotionSaving, setPromotionSaving] = useState(false);
	const [infoOpen, setInfoOpen] = useState(true);
	const [assignOpen, setAssignOpen] = useState(true);
	const [serverValidated, setServerValidated] = useState(false);
	const validatedSnapshotRef = useRef<string | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		trigger,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<CreatePromoCodeFormValues>({
		resolver: yupResolver(
			createPromoCodeSchema,
		) as Resolver<CreatePromoCodeFormValues>,
		defaultValues: createPromoCodeFormDefaultValues,
		mode: "onTouched",
	});

	const discountType = watch("discountType");
	const duration = watch("duration");
	const limitToAssignment = watch("limitToAssignment");
	const corporationId = watch("corporationId");

	const minExpiryDate = useMemo(() => getPromoExpiryMinDateIso(), []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setPlansLoading(true);
			const r = await getPricingPlans();
			if (cancelled) return;
			if (!r.ok) {
				toast.error(C.errors.loadPlans);
				setPlanTypes([]);
			} else {
				setPlanTypes(r.data);
			}
			setPlansLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setCorpsLoading(true);
			const r = await getCorporationsList();
			if (cancelled) return;
			if (!r.ok) {
				toast.error(C.errors.loadCorporations);
				setCorporations([]);
			} else {
				setCorporations(r.data);
			}
			setCorpsLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setActiveCompaniesLoading(true);
			const r = await getActiveCompanies();
			if (cancelled) return;
			setActiveCompaniesLoading(false);
			if (!r.ok) {
				toast.error(C.errors.loadCompanies);
				setActiveCompanies([]);
				return;
			}
			setActiveCompanies(r.data);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const subscription = watch(() => {
			if (validatedSnapshotRef.current == null) return;
			const snap = updatePromoCodePayloadSnapshot(getValues());
			if (snap !== validatedSnapshotRef.current) {
				setServerValidated(false);
			}
		});
		return () => subscription.unsubscribe();
	}, [watch, getValues]);

	const companyChoices = useMemo(() => {
		const cid = corporationId?.trim();
		if (!cid) return [];
		return activeCompanies.filter((c) => c.corporationId === cid);
	}, [activeCompanies, corporationId]);

	useEffect(() => {
		if (!limitToAssignment || !corporationId?.trim()) {
			setValue("companyId", "");
			return;
		}
		if (activeCompaniesLoading) return;
		const cid = corporationId.trim();
		const choices = activeCompanies.filter((c) => c.corporationId === cid);
		const cur = getValues("companyId")?.trim();
		if (cur && !choices.some((c) => c.id === cur)) {
			setValue("companyId", "");
		}
	}, [
		limitToAssignment,
		corporationId,
		activeCompanies,
		activeCompaniesLoading,
		getValues,
		setValue,
	]);

	const loadDetail = useCallback(async () => {
		if (!promoCodeId?.trim()) {
			setLoadError(C.detail.notFound);
			setDetailLoading(false);
			return;
		}
		setDetailLoading(true);
		setLoadError(null);
		const res = await getPromoCodeById(promoCodeId);
		if (!res.ok) {
			setDetail(null);
			setLoadError(res.status === 404 ? C.detail.notFound : C.detail.loadError);
			setDetailLoading(false);
			return;
		}
		const d = res.data;
		setDetail(d);
		const formValues: CreatePromoCodeFormValues = {
			code: d.code,
			planTypeId: d.planTypeId as CreatePromoCodeFormValues["planTypeId"],
			description: d.description?.trim() ?? "",
			discountType: d.discountType,
			discountValue: String(d.discountValue),
			duration: d.duration,
			expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : "",
			maxRedemptions: d.maxRedemptions != null ? String(d.maxRedemptions) : "",
			limitToAssignment: d.limitToAssignment,
			corporationId: d.corporationId ?? "",
			companyId: d.companyId ?? "",
		};
		reset(formValues);
		validatedSnapshotRef.current = updatePromoCodePayloadSnapshot(formValues);
		setServerValidated(true);
		setDetailLoading(false);
	}, [promoCodeId, reset]);

	useEffect(() => {
		void loadDetail();
	}, [loadDetail]);

	const handleValidateNow = async () => {
		if (!promoCodeId?.trim()) return;
		const ok = await trigger();
		if (!ok) return;
		const payload = buildUpdatePayloadFromForm(getValues());
		const res = await postValidatePromoCodeUpdate(promoCodeId, payload);
		if (!res.ok) {
			toast.error(
				typeof res.message === "string" ? res.message : C.errors.generic,
			);
			return;
		}
		validatedSnapshotRef.current = updatePromoCodePayloadSnapshot(getValues());
		setServerValidated(true);
		toast.success(res.message);
	};

	const onSubmit = async (values: CreatePromoCodeFormValues) => {
		if (!promoCodeId?.trim()) return;
		const res = await patchUpdatePromoCode(
			promoCodeId,
			buildUpdatePayloadFromForm(values),
		);

		if (!res.ok) {
			toast.error(
				typeof res.message === "string" ? res.message : C.errors.generic,
			);
			return;
		}

		toast.success(res.message);
		navigate(ROUTES.promoCodes.root);
	};

	const applyPromotionActive = useCallback(
		async (next: boolean) => {
			if (!promoCodeId?.trim()) return;
			setPromotionSaving(true);
			try {
				const res = await patchPromoCodePromotionActive(promoCodeId, next);
				if (!res.ok) {
					toast.error(res.message || C.list.activationFailed);
					return;
				}
				toast.success(C.list.activationUpdated);
				await loadDetail();
			} finally {
				setPromotionSaving(false);
			}
		},
		[promoCodeId, loadDetail],
	);

	const confirmDelete = useCallback(async () => {
		if (!promoCodeId?.trim()) return;
		setDeleteInProgress(true);
		try {
			const res = await deletePromoCode(promoCodeId);
			if (!res.ok) {
				toast.error(
					typeof res.message === "string" ? res.message : C.list.deleteFailed,
				);
				return;
			}
			toast.success(C.list.deleteSuccess);
			setDeleteOpen(false);
			navigate(ROUTES.promoCodes.root);
		} finally {
			setDeleteInProgress(false);
		}
	}, [promoCodeId, navigate]);

	const canTogglePromotion = detail != null && detail.status !== "expired";
	const scheduleLockedHint = C.edit.scheduleLockedHint;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{detailLoading ? (
				<AppLoader className="py-20" />
			) : loadError ? (
				<div className="mx-auto max-w-lg space-y-4">
					<p className="text-sm text-destructive">{loadError}</p>
					<Button type="button" variant="outline" asChild>
						<Link to={ROUTES.promoCodes.root}>{C.detail.back}</Link>
					</Button>
				</div>
			) : (
				<div className="flex min-h-0 w-full flex-1 flex-col">
					<div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-heading-4 font-semibold text-text-foreground">
								{C.edit.title}
							</h1>
							<p className="mt-2 max-w-2xl text-small leading-relaxed text-text-secondary">
								{C.edit.subtitle}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							icon={Trash2}
							className="shrink-0 border-destructive/60 text-destructive hover:bg-destructive/10"
							onClick={() => setDeleteOpen(true)}
						>
							{C.edit.deleteCta}
						</Button>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full">
						<AddPromoCodeFormShell>
							<div className="flex flex-col p-6">
								<div className="space-y-4">
									<div className="flex flex-col gap-6">
										<PromoCodePromotionEnableWarning
											className="shrink-0"
											title={C.detail.enableSection.warningTitle}
											body={C.detail.enableSection.warningBody}
										/>
										<div className="flex shrink-0 flex-row items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
											<div className="min-w-0 flex-1 space-y-1">
												<p className="text-base font-normal text-foreground">
													{C.detail.enableSection.title}
												</p>
												<p className="text-sm text-muted-foreground">
													{C.detail.enableSection.subtitle}
												</p>
											</div>
											<Switch
												checked={Boolean(detail?.stripePromotionCodeActive)}
												disabled={
													!canTogglePromotion || promotionSaving || !detail
												}
												title={
													!canTogglePromotion
														? C.detail.switchDisabledHint
														: undefined
												}
												onCheckedChange={(v) => void applyPromotionActive(v)}
												aria-label={`${C.detail.enableSection.title}. ${C.detail.enableSection.subtitle}`}
											/>
										</div>
									</div>

									<PromoCodeFormCollapsibleSection
										title={C.sections.promoInfo}
										open={infoOpen}
										onOpenChange={setInfoOpen}
									>
										<PromoCodeFormInfoFields
											register={register}
											errors={errors}
											setValue={setValue}
											watch={watch}
											planTypes={planTypes}
											plansLoading={plansLoading}
											discountType={discountType}
											duration={duration}
											minExpiryDate={minExpiryDate}
											scheduleLocked
											scheduleLockedHint={scheduleLockedHint}
										/>
									</PromoCodeFormCollapsibleSection>

									<PromoCodeFormCollapsibleSection
										title={C.sections.assignment}
										open={assignOpen}
										onOpenChange={setAssignOpen}
									>
										<PromoCodeFormAssignmentFields
											errors={errors}
											setValue={setValue}
											watch={watch}
											corporations={corporations}
											corpsLoading={corpsLoading}
											activeCompaniesLoading={activeCompaniesLoading}
											companyChoices={companyChoices}
											limitToAssignment={limitToAssignment}
											corporationId={corporationId}
										/>
									</PromoCodeFormCollapsibleSection>

									<PromoCodeFormValidationFooter
										serverValidated={serverValidated}
										validationSuccessTitle={C.validationSuccessTitle}
										validationSuccessBody={C.edit.validationSuccessBody}
										validationBannerTitle={C.edit.revalidateBannerTitle}
										validationBannerBody={C.edit.revalidateBannerBody}
										validateCta={C.edit.revalidateCta}
										onValidate={handleValidateNow}
										cancelLabel={C.actions.cancel}
										onCancel={() =>
											navigate(
												promoCodeId
													? ROUTES.promoCodes.viewWithIdPath(promoCodeId)
													: ROUTES.promoCodes.root,
											)
										}
										submitDisabled={!serverValidated}
										submitTitleHint={
											!serverValidated ? C.edit.saveBlockedHint : undefined
										}
										submitIdleLabel={C.edit.saveUpdate}
										isSubmitting={isSubmitting}
										submittingLabel={C.actions.submitting}
									/>
								</div>
							</div>
						</AddPromoCodeFormShell>
					</form>
				</div>
			)}
			<ConfirmationModal
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={C.edit.deleteDialogTitle}
				description={C.edit.deleteDialogDescription}
				icon={<Trash2 className="text-destructive size-12" aria-hidden />}
				confirmLabel={C.edit.deleteDialogConfirm}
				cancelLabel={C.edit.deleteDialogCancel}
				onConfirm={confirmDelete}
				isConfirming={deleteInProgress}
				variant="destructive"
				confirmIcon={Trash2}
			/>
		</AppLayout>
	);
}
