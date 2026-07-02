import { Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingFees } from "@/api";
import { BSPBadge, DetailRow } from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ADD_NEW_COMPANY_CONTENT as AC,
	COMPANIES_DIRECTORY_PAGE_CONTENT as CD,
	CONTACT_TYPE_FILTER_OPTIONS,
	CORPORATE_DIRECTORY_PAGE_CONTENT as CorpC,
	EMPTY_VALUE_PLACEHOLDER,
	ROUTES,
} from "@/const";
import type {
	CompanyDetailData,
	CompanyDetailKeyContact,
	CompanyStatus,
	CompanyViewPlanSeatsTabProps,
	OnboardingFees,
} from "@/types";
import {
	computeCompanyPlanDisplayInvoiceAmount,
	formatAddress,
	formatCode,
	formatCurrencyAmount,
	formatDateShort,
	formatFullName,
	formatPlanEmployeeRange,
	getBrandLogoDisplayUrl,
} from "@/utils";

const ac = AC;
const confirm = ac.confirmation;
const pc = ac.planAndSeats.planConfiguration;
const planSeatsContent = ac.planAndSeats;
const gs = ac.configuration.generalSettings;

function PlanConfigurationCardHeader({
	showManageInBillingCta,
	companyId,
}: {
	showManageInBillingCta?: boolean;
	companyId: string;
}) {
	const navigate = useNavigate();

	const handleManageInBilling = () => {
		navigate(ROUTES.finance.billingDetailWithIdPath(companyId));
	};

	return (
		<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
			<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
				{CD.viewPlanConfigurationCard}
			</CardTitle>
			{showManageInBillingCta ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					icon={Settings2}
					className="h-8 min-h-8 shrink-0 gap-1.5 rounded-lg bg-info-bg px-3 text-small font-semibold text-brand-info shadow-none hover:bg-info-bg hover:text-brand-primary"
					tabIndex={0}
					aria-label={planSeatsContent.manageInBillingAriaLabel}
					onClick={handleManageInBilling}
				>
					{planSeatsContent.manageInBilling}
				</Button>
			) : null}
		</CardHeader>
	);
}

function getCompanyKeyContactTypeLabel(contactType: string): string {
	const match = CONTACT_TYPE_FILTER_OPTIONS.find(
		(o) => o.value !== "all" && o.value === contactType,
	);
	return match?.label ?? contactType.replace(/_/g, " ");
}

function toCompanyStatus(status: string | undefined): CompanyStatus | null {
	const s = status?.toLowerCase() ?? "";
	if (
		s === "active" ||
		s === "suspended" ||
		s === "incomplete" ||
		s === "closed"
	)
		return s;
	return null;
}

export function CompanyViewBasicInfoTab({
	company,
}: {
	company: CompanyDetailData;
}) {
	const status = toCompanyStatus(company.status);
	const F = AC.fields;
	const parent = company.corporation;
	const region = parent?.dataResidencyRegion ?? "";
	const ca = company.companyAdmin;

	return (
		<div className="grid w-full grid-cols-1 items-start gap-4 pb-6 lg:grid-cols-2">
			<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
					<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
						{CD.viewCardCompanyBasics}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex w-full flex-col gap-4 px-4 pt-4 pb-0">
					<div className="flex w-full flex-col gap-3">
						<DetailRow
							label={CD.viewFieldCompanyId}
							value={formatCode(company.companyCode, "COMP")}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow label={CorpC.viewFieldStatus}>
							{status ? (
								<BSPBadge type={status} className="capitalize">
									{status}
								</BSPBadge>
							) : (
								CD.statusUnavailableLabel
							)}
						</DetailRow>
						<DetailRow
							label={F.companyLegalName}
							value={company.legalName}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.dbaTradeName}
							value={company.dbaName}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.websiteUrl}
							value={company.website}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.companyType}
							value={company.companyType}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.officeType}
							value={company.officeType}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.region}
							value={region}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.industry}
							value={company.industry}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={F.companyPhoneNo}
							value={company.phoneNo}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={AC.cards.companyAddress}
							value={formatAddress(company)}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
					</div>
				</CardContent>
			</Card>
			<div className="flex w-full flex-col gap-4">
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
							{CD.viewCardParentCorporation}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex w-full flex-col gap-4 px-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<DetailRow
								label={F.parentCorporationLegalName}
								value={parent?.legalName ?? ""}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={F.ownershipType}
								value={parent?.ownershipType ?? ""}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
							{AC.cards.companyAdmin}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<DetailRow
								label={CorpC.viewFieldFullName}
								value={formatFullName(ca?.firstName, ca?.lastName)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CorpC.viewFieldNickname}
								value={ca?.nickname}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CorpC.viewFieldJobRole}
								value={ca?.jobRole}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CorpC.viewFieldEmail}
								value={ca?.email}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CorpC.viewFieldWorkPhoneNo}
								value={ca?.workPhone}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CorpC.viewFieldCellPhoneNo}
								value={ca?.cellPhone}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function KeyContactCard({
	title,
	contact,
}: {
	title: string;
	contact: CompanyDetailKeyContact | undefined;
}) {
	return (
		<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
			<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
				<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pt-4 pb-0">
				<div className="flex w-full flex-col gap-3">
					<DetailRow
						label={CorpC.viewFieldFullName}
						value={formatFullName(contact?.firstName, contact?.lastName)}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					<DetailRow
						label={CorpC.viewFieldNickname}
						value={contact?.nickname}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					<DetailRow
						label={CorpC.viewFieldJobRole}
						value={contact?.jobRole}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					<DetailRow
						label={CorpC.viewFieldEmail}
						value={contact?.email}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					<DetailRow
						label={CorpC.viewFieldWorkPhoneNo}
						value={contact?.workPhone}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					<DetailRow
						label={CorpC.viewFieldCellPhoneNo}
						value={contact?.cellPhone}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export function CompanyViewKeyContactsTab({
	company,
}: {
	company: CompanyDetailData;
}) {
	const contacts = company.keyContacts ?? [];

	if (contacts.length === 0) {
		return (
			<div className="w-full">
				<Card className="w-full max-w-2xl gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardContent className="p-4">
						<p className="py-6 text-small text-text-secondary">
							{CD.viewNoKeyContacts}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-2 pb-6">
			{contacts.map((contact) => (
				<KeyContactCard
					key={contact.id ?? contact.contactType}
					title={getCompanyKeyContactTypeLabel(contact.contactType)}
					contact={contact}
				/>
			))}
		</div>
	);
}

function formatCheckoutPromoDisplay(checkoutPromoCode?: string | null): string {
	const trimmed = checkoutPromoCode?.trim();
	return trimmed || CD.viewNotApplicable;
}

function formatAssessmentQuantityDisplay(quantity?: number | null): string {
	if (quantity == null || !Number.isFinite(quantity)) {
		return EMPTY_VALUE_PLACEHOLDER;
	}
	return String(quantity);
}

function PlanConfigurationRows({
	company,
	planDisplayName,
	invoiceAmountDisplay,
}: {
	company: CompanyDetailData;
	planDisplayName: string;
	invoiceAmountDisplay: string;
}) {
	const seat = company.planSeat;
	const plan = company.plan;

	return (
		<>
			<DetailRow
				label={confirm.planFields.promoCode}
				value={formatCheckoutPromoDisplay(seat?.checkoutPromoCode)}
			/>
			<DetailRow
				label={confirm.planFields.plan}
				value={planDisplayName}
				emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
			/>
			<DetailRow
				label={pc.planLevel}
				value={formatPlanEmployeeRange(
					plan?.employeeRangeMin ?? null,
					plan?.employeeRangeMax ?? null,
				)}
				emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
			/>
			<DetailRow
				label={pc.planPrice}
				value={formatCurrencyAmount(seat?.planPrice)}
				emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
			/>
			<DetailRow
				label={pc.discount}
				value={formatCurrencyAmount(seat?.discount)}
				emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
			/>
			<DetailRow label={pc.invoiceAmount} value={invoiceAmountDisplay} />
			<DetailRow
				label={pc.billingCurrency}
				value={seat?.billingCurrency}
				emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
			/>
		</>
	);
}

function TrialConfigurationCard({ company }: { company: CompanyDetailData }) {
	const seat = company.planSeat;
	const zeroLabel = seat ? (seat.zeroTrial ? CD.viewOn : CD.viewOff) : "";

	const auto =
		seat?.autoConvertTrial === true
			? CD.viewAutoConvertOnDefault
			: seat
				? CD.viewOff
				: "";

	return (
		<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
			<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
				<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
					{CD.viewTrialConfigurationCard}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex w-full flex-col gap-4 pt-4 pb-0">
				<div className="flex w-full flex-col gap-3">
					<DetailRow
						label={CD.viewFieldZeroTrial}
						value={zeroLabel}
						emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
					/>
					{!seat?.zeroTrial && (
						<>
							<DetailRow
								label={CD.viewFieldTrialLength}
								value={
									seat?.trialLengthDuration && seat?.trialLengthType
										? `${seat.trialLengthDuration} ${seat.trialLengthType}`
										: EMPTY_VALUE_PLACEHOLDER
								}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CD.viewFieldTrialStartDate}
								value={formatDateShort(seat?.trialStartDate)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CD.viewFieldTrialEndDate}
								value={formatDateShort(seat?.trialEndDate)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CD.viewFieldAutoConvertTrial}
								value={auto}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export function CompanyViewPlanSeatsTab({
	company,
	showManageInBillingCta = false,
}: CompanyViewPlanSeatsTabProps) {
	const plan = company.plan;
	const seat = company.planSeat;
	const [onboardingFees, setOnboardingFees] = useState<OnboardingFees | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		void getOnboardingFees().then((result) => {
			if (!cancelled && result.ok) {
				setOnboardingFees(result.data);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const invoiceAmountDisplay = useMemo(() => {
		const amount = computeCompanyPlanDisplayInvoiceAmount(
			company,
			onboardingFees,
		);
		return amount != null
			? formatCurrencyAmount(amount)
			: EMPTY_VALUE_PLACEHOLDER;
	}, [company, onboardingFees]);

	if (!plan?.id) {
		return (
			<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<CardContent className="pt-4 pb-0">
					<p className="text-small text-text-secondary">
						{CD.viewPlanDetailsUnavailable}
					</p>
				</CardContent>
			</Card>
		);
	}

	const planDisplayName = company.plan?.planType?.name ?? "";

	if (plan?.planTypeId === "one_time") {
		return (
			<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<PlanConfigurationCardHeader
						companyId={company.id}
						showManageInBillingCta={showManageInBillingCta}
					/>
					<CardContent className="flex w-full flex-col gap-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<DetailRow
								label={confirm.planFields.promoCode}
								value={formatCheckoutPromoDisplay(seat?.checkoutPromoCode)}
							/>
							<DetailRow
								label={confirm.planFields.plan}
								value={planDisplayName}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={CD.viewFieldNoOfAssessments}
								value={formatAssessmentQuantityDisplay(
									company.assessmentQuantity,
								)}
							/>
							<DetailRow
								label={CD.viewFieldPricePerAssessment}
								value={formatCurrencyAmount(seat?.planPrice)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={pc.invoiceAmount}
								value={invoiceAmountDisplay}
							/>
							<DetailRow
								label={pc.billingCurrency}
								value={seat?.billingCurrency}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (plan?.planTypeId === "monthly") {
		return (
			<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
				<TrialConfigurationCard company={company} />
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<PlanConfigurationCardHeader
						companyId={company.id}
						showManageInBillingCta={showManageInBillingCta}
					/>
					<CardContent className="flex w-full flex-col gap-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<PlanConfigurationRows
								company={company}
								planDisplayName={planDisplayName}
								invoiceAmountDisplay={invoiceAmountDisplay}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
			<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<PlanConfigurationCardHeader
					companyId={company.id}
					showManageInBillingCta={showManageInBillingCta}
				/>
				<CardContent className="flex w-full flex-col gap-4 pt-4 pb-0">
					<div className="flex w-full flex-col gap-3">
						<PlanConfigurationRows
							company={company}
							planDisplayName={planDisplayName}
							invoiceAmountDisplay={invoiceAmountDisplay}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export function CompanyViewBrandingTab({
	company,
}: {
	company: CompanyDetailData;
}) {
	const logoUrl = getBrandLogoDisplayUrl(company.brandLogo ?? null);

	return (
		<div className="max-w-2xl">
			<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-sm">
				<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
					<CardTitle className="flex flex-1 items-center text-base font-normal text-text-foreground">
						{confirm.sections.brandingExperience}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-4 pb-6">
					{logoUrl ? (
						<Card className="flex size-72 flex-col items-center justify-center rounded-lg border border-border bg-white p-6">
							<div className="relative flex size-64 items-center justify-center overflow-hidden rounded-lg bg-white">
								<img
									src={logoUrl}
									alt={ac.configuration.branding.logoAlt}
									className="max-h-full max-w-full object-contain"
									crossOrigin="anonymous"
									referrerPolicy="no-referrer"
								/>
							</div>
						</Card>
					) : (
						<p className="py-6 text-small text-text-secondary">
							{CorpC.viewNoLogoUploaded}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export function CompanyViewConfigurationTab({
	company,
}: {
	company: CompanyDetailData;
}) {
	const cfg = company.configuration;

	return (
		<div className="max-w-2xl">
			<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
					<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
						{gs.title}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 pt-4 pb-0">
					<div className="flex w-full flex-col gap-3">
						<DetailRow
							label={gs.authenticationMethod}
							value={cfg?.authMethod}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={gs.passwordPolicy}
							value={cfg?.passwordPolicy}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={gs.sessionTimeout}
							value={cfg?.sessionTimeout}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={gs.twoFaRequirement}
							value={cfg?.mfa}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={gs.securityPosture}
							value={cfg?.securityPosture}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={gs.primaryLanguage}
							value={cfg?.primaryLanguage}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
