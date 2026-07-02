import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	getActiveCompanies,
	getCorporationsList,
	getPricingPlans,
	postCreatePromoCode,
	postValidatePromoCodeCreate,
} from "@/api";
import {
	PromoCodeFormAssignmentFields,
	PromoCodeFormCollapsibleSection,
	PromoCodeFormInfoFields,
	PromoCodeFormValidationFooter,
} from "@/components";
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
} from "@/types";
import {
	buildCreatePromoPayload,
	createPromoCodePayloadSnapshot,
	getPromoExpiryMinDateIso,
} from "@/utils";

const C = PROMO_CODES_PAGE_CONTENT;

export function AddPromoCodePage() {
	const navigate = useNavigate();
	const breadcrumbs = [
		{ label: C.breadcrumbManagement, path: ROUTES.promoCodes.root },
		{ label: C.breadcrumbAdd },
	];

	const [planTypes, setPlanTypes] = useState<PricingPlanType[]>([]);
	const [plansLoading, setPlansLoading] = useState(true);
	const [corporations, setCorporations] = useState<CorporationListOption[]>([]);
	const [corpsLoading, setCorpsLoading] = useState(true);
	const [activeCompanies, setActiveCompanies] = useState<
		ActiveCompanyListItem[]
	>([]);
	const [activeCompaniesLoading, setActiveCompaniesLoading] = useState(true);

	const [infoOpen, setInfoOpen] = useState(true);
	const [assignOpen, setAssignOpen] = useState(true);
	const [serverValidated, setServerValidated] = useState(false);
	const validatedSnapshotRef = useRef<string | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
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
			const snap = createPromoCodePayloadSnapshot(getValues());
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

	const handleValidateNow = async () => {
		const ok = await trigger();
		if (!ok) return;
		const payload = buildCreatePromoPayload(getValues());
		const res = await postValidatePromoCodeCreate(payload);
		if (!res.ok) {
			toast.error(
				typeof res.message === "string" ? res.message : C.errors.generic,
			);
			return;
		}
		validatedSnapshotRef.current = createPromoCodePayloadSnapshot(getValues());
		setServerValidated(true);
		toast.success(res.message);
	};

	const onSubmit = async (values: CreatePromoCodeFormValues) => {
		const res = await postCreatePromoCode(buildCreatePromoPayload(values));

		if (!res.ok) {
			toast.error(
				typeof res.message === "string" ? res.message : C.errors.generic,
			);
			return;
		}

		toast.success(`${C.result.title}: ${res.data.code}`, {
			description: C.result.body,
		});
		navigate(ROUTES.promoCodes.root);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex min-h-0 w-full flex-1 flex-col">
				<div className="mb-6 shrink-0">
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{C.title}
					</h1>
					<p className="mt-2 max-w-2xl text-small leading-relaxed text-text-secondary">
						{C.subtitle}
					</p>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full">
					<AddPromoCodeFormShell>
						<div className="flex flex-col p-6">
							<div className="space-y-4">
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
										scheduleLocked={false}
										scheduleLockedHint=""
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
									validationSuccessBody={C.validationSuccessBody}
									validationBannerTitle={C.validationBannerTitle}
									validationBannerBody={C.validationBannerBody}
									validateCta={C.validateNow}
									onValidate={handleValidateNow}
									cancelLabel={C.actions.cancel}
									onCancel={() => navigate(ROUTES.promoCodes.root)}
									submitDisabled={!serverValidated}
									submitTitleHint={
										!serverValidated ? C.addBlockedHint : undefined
									}
									submitIdleLabel={C.actions.addPromoCode}
									isSubmitting={isSubmitting}
									submittingLabel={C.actions.submitting}
								/>
							</div>
						</div>
					</AddPromoCodeFormShell>
				</form>
			</div>
		</AppLayout>
	);
}
