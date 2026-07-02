import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getOnboardingFees } from "@/api";
import { FormStepSkeleton } from "@/components/common";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import {
	ADD_NEW_COMPANY_CONTENT,
	COMPANY_KEY_CONTACT_TYPES,
	CONFIRMATION_STEP_CONTENT,
	CONTACT_TYPE_FILTER_OPTIONS,
	normalizeOnsiteTrainingApiOption,
	PLAN_ONSITE_TRAINING_OPTIONS,
} from "@/const";
import { useCompanyDirectoryStore } from "@/store";
import type {
	CompanyPlanSeatDetail,
	KeyContactType,
	OnboardingFees,
	OnsiteTrainingApiOption,
} from "@/types";
import {
	formatAddress,
	formatCurrencyAmount,
	formatFullName,
	formatPlanEmployeeRange,
	getBrandLogoDisplayUrl,
	roundCurrencyToTwoDecimals,
} from "@/utils";

const ac = ADD_NEW_COMPANY_CONTENT;
const confirm = ac.confirmation;
const f = ac.fields;
const cards = ac.cards;
const pc = ac.planAndSeats.planConfiguration;
const gs = ac.configuration.generalSettings;
const b = ac.configuration.branding;

const C = CONFIRMATION_STEP_CONTENT;
const CD = C.companyDetailsFields;
const CA = C.companyAdminInfoFields;
const CorpA = C.corporationAdminInfoFields;

function getKeyContactTypeLabel(contactType: KeyContactType): string {
	const match = CONTACT_TYPE_FILTER_OPTIONS.find(
		(o) => o.value !== "all" && o.value === contactType,
	);
	return match?.label ?? contactType.replace(/_/g, " ");
}

function FieldItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-small font-normal text-text-secondary">{label}</p>
			<p className="text-small font-semibold text-text-foreground">
				{value ? value : "-"}
			</p>
		</div>
	);
}

function onsiteTrainingFeeAmountFromOnboarding(
	fees: OnboardingFees | null,
	option: OnsiteTrainingApiOption,
): number {
	if (option === "off" || !fees) return 0;
	const amount = fees.onsiteTraining[option].amount;
	return amount != null && Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function formatOnsiteTrainingConfirmationValue(
	seat: CompanyPlanSeatDetail,
	fees: OnboardingFees | null,
): string {
	const opt = normalizeOnsiteTrainingApiOption(seat.onsiteTrainingOption);
	const label =
		PLAN_ONSITE_TRAINING_OPTIONS.find((o) => o.apiValue === opt)?.label ?? opt;
	const fee = onsiteTrainingFeeAmountFromOnboarding(fees, opt);
	return `${label} (${formatCurrencyAmount(fee)})`;
}

export function CompanyConfirmationStep() {
	const [searchParams] = useSearchParams();
	const isEditMode = searchParams.get("flow") === "edit";
	const { companyDetail, companyDetailLoading } = useCompanyDirectoryStore();
	const [onboardingFees, setOnboardingFees] = useState<OnboardingFees | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		getOnboardingFees().then((result) => {
			if (cancelled || !result.ok) return;
			setOnboardingFees(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const implementationFeeAmount = onboardingFees?.implementationFee.amount ?? 0;

	const planSummary = companyDetail?.plan;
	const planSeat = companyDetail?.planSeat;
	const planTypeId = planSummary?.planTypeId ?? "";
	const isOneTimePlan = planTypeId === "one_time";
	const planNameDisplay = planSummary?.planType?.name ?? "";

	const onsiteTrainingFeeAmount = planSeat
		? onsiteTrainingFeeAmountFromOnboarding(
				onboardingFees,
				normalizeOnsiteTrainingApiOption(planSeat.onsiteTrainingOption),
			)
		: 0;

	const computedInvoiceAmount = planSeat
		? roundCurrencyToTwoDecimals(
				Math.max(
					0,
					Number(planSeat.planPrice ?? 0) -
						Number(planSeat.discount ?? 0) +
						implementationFeeAmount +
						onsiteTrainingFeeAmount,
				),
			)
		: 0;

	const planLevelDisplay = formatPlanEmployeeRange(
		planSummary?.employeeRangeMin,
		planSummary?.employeeRangeMax,
	);

	const logoDisplayUrl = getBrandLogoDisplayUrl(
		companyDetail?.brandLogo ?? null,
	);

	const configuration = companyDetail?.configuration;

	const confirmActionLabel = isEditMode
		? ac.buttons.confirmUpdate
		: ac.buttons.confirmAdd;

	const noteBodyAfter = isEditMode
		? confirm.noteBodyAfterEdit
		: confirm.noteBodyAfter;

	if (companyDetailLoading && !companyDetail) {
		return <FormStepSkeleton fieldCount={12} />;
	}

	if (!companyDetail) {
		return (
			<p className="text-small text-muted-foreground">
				{ac.configuration.errors.missingCompanyId}
			</p>
		);
	}

	const sectionCardClass = "rounded-lg border border-border p-4";

	const corp = companyDetail.corporation;
	const corpAdmin = corp?.corporationAdmin;
	const regionLabel = corp?.dataResidencyRegion ?? "";
	const ca = companyDetail.companyAdmin;

	const keyContactName = (type: KeyContactType) => {
		const contact = companyDetail.keyContacts?.find(
			(k) => k.contactType === type,
		);
		return formatFullName(contact?.firstName, contact?.lastName);
	};

	return (
		<div className="space-y-6">
			<Banner variant="default" title={confirm.noteTitle}>
				{confirm.noteBodyBefore}
				<strong className="text-text-foreground">{confirmActionLabel}</strong>
				{noteBodyAfter}
			</Banner>

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.corporationInfo}
				</p>
				<div className={sectionCardClass}>
					<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<div className="space-y-4">
							<FieldItem
								label={f.parentCorporationLegalName}
								value={corp?.legalName ?? ""}
							/>
						</div>
						<div className="space-y-4">
							<FieldItem
								label={f.ownershipType}
								value={corp?.ownershipType ?? ""}
							/>
						</div>
					</div>
				</div>
			</div>

			{corpAdmin && (
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{confirm.sections.corporationAdminInfo}
					</p>
					<div className={sectionCardClass}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div className="space-y-4">
								<FieldItem
									label={CorpA.fullName}
									value={formatFullName(
										corpAdmin.firstName,
										corpAdmin.lastName,
									)}
								/>
								<FieldItem
									label={CorpA.jobRole}
									value={corpAdmin.jobRole ?? ""}
								/>
								<FieldItem
									label={CorpA.workPhoneNo}
									value={corpAdmin.workPhone ?? ""}
								/>
							</div>
							<div className="space-y-4">
								<FieldItem
									label={CorpA.nickname}
									value={corpAdmin.nickname ?? ""}
								/>
								<FieldItem label={CorpA.email} value={corpAdmin.email ?? ""} />
								<FieldItem
									label={CorpA.cellPhoneNo}
									value={corpAdmin.cellPhone ?? ""}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.companyInfo}
				</p>
				<div className={sectionCardClass}>
					<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<FieldItem
							label={CD.companyLegalName}
							value={companyDetail.legalName ?? ""}
						/>
						<FieldItem
							label={f.dbaTradeName}
							value={companyDetail.dbaName ?? ""}
						/>
						<FieldItem
							label={f.websiteUrl}
							value={companyDetail.website ?? ""}
						/>
						<FieldItem
							label={CD.companyType}
							value={companyDetail.companyType ?? ""}
						/>
						<FieldItem
							label={CD.officeType}
							value={companyDetail.officeType ?? ""}
						/>
						<FieldItem label={f.region} value={regionLabel} />
						<FieldItem
							label={CD.industry}
							value={companyDetail.industry ?? ""}
						/>
						<FieldItem
							label={f.companyPhoneNo}
							value={companyDetail.phoneNo ?? ""}
						/>
						<div className="md:col-span-1">
							<FieldItem
								label={cards.companyAddress}
								value={formatAddress(companyDetail)}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.companyAdminInfo}
				</p>
				<div className={sectionCardClass}>
					<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<div className="space-y-4">
							<FieldItem
								label={CA.fullName}
								value={formatFullName(ca?.firstName, ca?.lastName)}
							/>
							<FieldItem label={CA.jobRole} value={ca?.jobRole ?? ""} />
							<FieldItem label={CA.workPhoneNo} value={ca?.workPhone ?? ""} />
						</div>
						<div className="space-y-4">
							<FieldItem label={CA.nickname} value={ca?.nickname ?? ""} />
							<FieldItem label={CA.email} value={ca?.email ?? ""} />
							<FieldItem label={CA.cellPhoneNo} value={ca?.cellPhone ?? ""} />
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.keyContacts}
				</p>
				<div className={sectionCardClass}>
					<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						{COMPANY_KEY_CONTACT_TYPES.map((type) => (
							<FieldItem
								key={type}
								label={getKeyContactTypeLabel(type)}
								value={keyContactName(type)}
							/>
						))}
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.planConfiguration}
				</p>
				<div className={sectionCardClass}>
					{planSeat ? (
						isOneTimePlan ? (
							<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
								<FieldItem
									label={confirm.planFields.plan}
									value={planNameDisplay}
								/>
								<FieldItem
									label={confirm.planFields.pricePerAssessment}
									value={formatCurrencyAmount(planSeat.planPrice)}
								/>
								<FieldItem
									label={confirm.planFields.billingCurrency}
									value={planSeat.billingCurrency}
								/>
								<div className="hidden md:block" aria-hidden />
							</div>
						) : (
							<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
								<FieldItem
									label={pc.promoCode}
									value={planSeat.checkoutPromoCode?.trim() ?? ""}
								/>
								<FieldItem
									label={confirm.planFields.plan}
									value={planNameDisplay}
								/>
								<FieldItem
									label={confirm.planFields.planLevel}
									value={planLevelDisplay}
								/>
								<FieldItem
									label={pc.planPrice}
									value={formatCurrencyAmount(planSeat.planPrice)}
								/>
								<FieldItem
									label={pc.discount}
									value={formatCurrencyAmount(planSeat.discount)}
								/>
								<FieldItem
									label={confirm.planFields.implementationFee}
									value={formatCurrencyAmount(implementationFeeAmount)}
								/>
								<FieldItem
									label={confirm.planFields.onsiteTraining}
									value={formatOnsiteTrainingConfirmationValue(
										planSeat,
										onboardingFees,
									)}
								/>
								<FieldItem
									label={pc.invoiceAmount}
									value={formatCurrencyAmount(computedInvoiceAmount)}
								/>
								<FieldItem
									label={pc.billingCurrency}
									value={planSeat.billingCurrency}
								/>
							</div>
						)
					) : (
						<p className="text-small text-muted-foreground">-</p>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{confirm.sections.configuration}
				</p>
				<div className={sectionCardClass}>
					<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<FieldItem
							label={gs.authenticationMethod}
							value={configuration?.authMethod ?? ""}
						/>
						<FieldItem
							label={gs.passwordPolicy}
							value={configuration?.passwordPolicy ?? ""}
						/>
						<FieldItem
							label={confirm.configurationSummaryLabels.sessionTimeout}
							value={configuration?.sessionTimeout ?? ""}
						/>
						<FieldItem
							label={gs.twoFaRequirement}
							value={configuration?.mfa ?? ""}
						/>
						<FieldItem
							label={gs.securityPosture}
							value={configuration?.securityPosture ?? ""}
						/>
						<FieldItem
							label={gs.primaryLanguage}
							value={configuration?.primaryLanguage ?? ""}
						/>
					</div>
				</div>
			</div>
			{logoDisplayUrl && (
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{confirm.sections.brandingExperience}
					</p>
					<div className={sectionCardClass}>
						<div className="max-w-xs space-y-1">
							<p className="text-small font-normal text-text-secondary">
								{C.brandLogo}
							</p>

							<Card className="flex size-72 flex-col items-center justify-center rounded-lg border border-border bg-white p-6">
								<div className="relative flex size-64 items-center justify-center overflow-hidden rounded-lg bg-white group">
									<img
										src={logoDisplayUrl}
										alt={b.logoAlt}
										className="max-h-full max-w-full object-contain"
									/>
								</div>
							</Card>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
