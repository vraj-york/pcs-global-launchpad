import { Building2 } from "lucide-react";
import { Fragment } from "react";
import { Banner } from "@/components/ui/banner";
import { Separator } from "@/components/ui/separator";
import {
	ADD_NEW_CORPORATION_CONTENT,
	CONFIRMATION_STEP_CONTENT,
	EMPTY_FIELD_VALUES,
} from "@/const";
import type {
	ConfirmationFieldValues,
	ConfirmationStepProps,
	CorporationDetail,
	CorporationDetailCompany,
} from "@/types";
import {
	formatFullName,
	formatPlanEmployeeRange,
	getBrandLogoDisplayUrl,
} from "@/utils";

function getFieldValuesFromDetail(
	detail: CorporationDetail,
): ConfirmationFieldValues {
	const addr = detail.address;
	const sponsor = detail.appKeyContacts?.find(
		(c) => c.contactType === "exec_sponsor",
	);
	const company = detail.companies?.[0];
	const addressLine =
		[addr?.addressLine, addr?.state, addr?.city, addr?.country, addr?.zip]
			.filter(Boolean)
			.join(", ") || "";

	const executiveSponsorFullName = formatFullName(
		sponsor?.firstName,
		sponsor?.lastName,
	);
	const adminFullName = formatFullName(company?.firstName, company?.lastName);

	return {
		corporationLegalName: detail.legalName ?? "",
		dbaName: detail.dbaName ?? "",
		region: detail.dataResidencyRegion ?? "",
		industry: detail.industry ?? "",
		companyIndustry: company?.industry ?? "",
		corporatePhoneNo: detail.phoneNo ?? "",
		websiteUrl: detail.website ?? "",
		ownershipType: detail.ownershipType ?? "",
		address: addressLine,
		timeZone: addr?.timezone ?? "",
		executiveSponsorFullName,
		executiveSponsorNickname: sponsor?.nickname ?? "",
		executiveSponsorJobRole: sponsor?.jobRole ?? "",
		email: sponsor?.email ?? "",
		workPhoneNo: sponsor?.workPhone ?? "",
		cellPhoneNo: sponsor?.cellPhone ?? "",
		companyLegalName: company?.legalName ?? "",
		companyType: company?.companyType ?? "",
		officeType: company?.officeType ?? "",
		stateProvince: company?.state ?? "",
		city: company?.city ?? "",
		zipPostalCode: company?.zip ?? "",
		adminFullName,
		adminNickname: company?.nickname ?? "",
		companyAdminEmail: company?.email ?? "",
		noOfEmployees: String(company?.noOfEmployees ?? ""),
		securityPosture: company?.securityPosture ?? "",
		companyPhoneNo: company?.phoneNo ?? "",
	};
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

/** Read-only company row for confirmation step – icon, name, plan + emp tags, detail lines (no card border; use inside single container with separators) */
function ConfirmationCompanyRow({
	company,
}: {
	company: CorporationDetailCompany;
}) {
	const plan = company.plan;
	const subscriptionLabel = plan?.planType?.name ?? "—";
	const empLabel = formatPlanEmployeeRange(
		plan?.employeeRangeMin,
		plan?.employeeRangeMax,
	);
	const showEmployeeBadge = plan != null;
	const detailLine1 =
		[company.companyType, company.state ?? company.country]
			.filter(Boolean)
			.join(" • ") || "—";
	const companyAdminName = formatFullName(
		company?.firstName,
		company?.lastName,
	);
	const detailLine2 =
		companyAdminName && company.email
			? `${companyAdminName} (${company.email})`
			: (company.email ?? "—");

	return (
		<div className="flex items-start gap-3">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-bg p-2">
				<Building2 className="size-5 text-link" aria-hidden />
			</div>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex min-h-6 flex-wrap items-center gap-2">
					<span className="min-w-0 truncate text-sm font-medium leading-6 text-text-foreground">
						{company.legalName || "—"}
					</span>
					<span className="inline-flex h-6 shrink-0 items-center justify-center rounded-lg bg-info-bg px-2 py-0.5 text-xs font-semibold text-link">
						{subscriptionLabel}
					</span>
					{showEmployeeBadge && (
						<span className="inline-flex h-6 shrink-0 items-center justify-center rounded-lg bg-success-bg px-2 py-0.5 text-xs font-semibold text-brand-green">
							{empLabel}
						</span>
					)}
				</div>
				<p className="text-xs leading-4 text-text-secondary">{detailLine1}</p>
				<p className="min-w-0 truncate text-xs leading-4 text-muted-foreground">
					{detailLine2}
				</p>
			</div>
		</div>
	);
}

export function ConfirmationStep({
	corporationDetail,
	isLoadingDetail,
	flow = "quick",
}: ConfirmationStepProps) {
	const fieldValues: ConfirmationFieldValues = corporationDetail
		? getFieldValuesFromDetail(corporationDetail)
		: EMPTY_FIELD_VALUES;
	const logoDisplayUrl = getBrandLogoDisplayUrl(
		corporationDetail?.brandLogo ?? null,
	);
	const showBrandingSection = flow === "advanced" && logoDisplayUrl;
	const corpAdmin = corporationDetail?.corporationAdminAppUser;
	const legalComplianceContact = corporationDetail?.appKeyContacts?.find(
		(c) => c.contactType === "legal_compliance_contact",
	);
	const C = CONFIRMATION_STEP_CONTENT;
	const F = C.corporationInfoFields;
	const ES = C.executiveSponsorInfoFields;
	const confirmationStepCopy =
		ADD_NEW_CORPORATION_CONTENT.advancedSteps.confirmation;
	const confirmAddLabel = ADD_NEW_CORPORATION_CONTENT.buttons.confirmAdd;

	if (isLoadingDetail && !corporationDetail) {
		return (
			<p className="text-small text-muted-foreground">
				{ADD_NEW_CORPORATION_CONTENT.loadingDetail}
			</p>
		);
	}

	// Quick flow layout
	if (flow === "quick") {
		const company = corporationDetail?.companies?.[0];
		const plan = company?.plan;
		const companyAddressLine =
			company &&
			[
				company.addressLine,
				company.state,
				company.city,
				company.country,
				company.zip,
			]
				.filter(Boolean)
				.join(", ");
		const planLevelLabel =
			company && plan
				? formatPlanEmployeeRange(plan.employeeRangeMin, plan.employeeRangeMax)
				: "";
		const planName = plan?.planType?.name ?? "";
		const CD = C.companyDetailsFields;
		const CA = C.companyAdminInfoFields;

		const sectionCardClass = "rounded-lg border border-border p-4";

		return (
			<div className="space-y-6">
				<Banner variant="default" title={confirmationStepCopy.noteTitle}>
					{confirmationStepCopy.noteBodyBefore}
					<strong className="text-text-foreground">{confirmAddLabel}</strong>
					{confirmationStepCopy.noteBodyAfter}
				</Banner>
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.corporationInfo}
					</p>
					<div className={sectionCardClass}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div className="space-y-4">
								<FieldItem
									label={F.corporationLegalName}
									value={fieldValues.corporationLegalName}
								/>
								<FieldItem
									label={F.websiteUrl}
									value={fieldValues.websiteUrl}
								/>
								<FieldItem label={F.region} value={fieldValues.region} />
								<FieldItem
									label={F.corporatePhoneNo}
									value={fieldValues.corporatePhoneNo}
								/>
								<FieldItem label={F.timeZone} value={fieldValues.timeZone} />
							</div>
							<div className="space-y-4">
								<FieldItem label={F.dbaName} value={fieldValues.dbaName} />
								<FieldItem
									label={F.ownershipType}
									value={fieldValues.ownershipType}
								/>
								<FieldItem label={F.industry} value={fieldValues.industry} />
								<FieldItem label={F.address} value={fieldValues.address} />
							</div>
						</div>
					</div>
				</div>

				{corpAdmin && (
					<div className="space-y-2">
						<p className="text-mini font-medium text-text-secondary">
							{C.corporationAdminInfo}
						</p>
						<div className={sectionCardClass}>
							<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
								<div className="space-y-4">
									<FieldItem
										label={C.corporationAdminInfoFields.fullName}
										value={formatFullName(
											corpAdmin?.firstName,
											corpAdmin?.lastName,
										)}
									/>
									<FieldItem
										label={C.corporationAdminInfoFields.jobRole}
										value={corpAdmin.jobRole ?? ""}
									/>
									<FieldItem
										label={C.corporationAdminInfoFields.workPhoneNo}
										value={corpAdmin.workPhone ?? ""}
									/>
								</div>
								<div className="space-y-4">
									<FieldItem
										label={C.corporationAdminInfoFields.nickname}
										value={corpAdmin.nickname ?? ""}
									/>
									<FieldItem
										label={C.corporationAdminInfoFields.email}
										value={corpAdmin.email ?? ""}
									/>
									<FieldItem
										label={C.corporationAdminInfoFields.cellPhoneNo}
										value={corpAdmin.cellPhone ?? ""}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.executiveSponsorInfo}
					</p>
					<div className={sectionCardClass}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div className="space-y-4">
								<FieldItem
									label={ES.fullName}
									value={fieldValues.executiveSponsorFullName}
								/>
								<FieldItem
									label={ES.role}
									value={fieldValues.executiveSponsorJobRole}
								/>
								<FieldItem
									label={ES.workPhoneNo}
									value={fieldValues.workPhoneNo}
								/>
							</div>
							<div className="space-y-4">
								<FieldItem
									label={ES.nickname}
									value={fieldValues.executiveSponsorNickname}
								/>
								<FieldItem label={ES.email} value={fieldValues.email} />
								<FieldItem
									label={ES.cellPhoneNo}
									value={fieldValues.cellPhoneNo}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.companyDetails}
					</p>
					<div className={sectionCardClass}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div className="space-y-4">
								<FieldItem
									label={CD.companyLegalName}
									value={fieldValues.companyLegalName}
								/>
								<FieldItem
									label={CD.officeType}
									value={fieldValues.officeType}
								/>
								<FieldItem
									label={CD.industry}
									value={fieldValues.companyIndustry}
								/>
								<FieldItem label={CD.planLevel} value={planLevelLabel} />
								<FieldItem
									label={CD.address}
									value={companyAddressLine ?? ""}
								/>
							</div>
							<div className="space-y-4">
								<FieldItem
									label={CD.companyType}
									value={fieldValues.companyType}
								/>
								<FieldItem label={CD.region} value={fieldValues.region} />
								<FieldItem label={CD.plan} value={planName} />
								<FieldItem
									label={CD.securityPosture}
									value={fieldValues.securityPosture}
								/>
								<FieldItem
									label={CD.companyPhoneNo}
									value={fieldValues.companyPhoneNo}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.companyAdminInfo}
					</p>
					<div className={sectionCardClass}>
						<div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div className="space-y-4">
								<FieldItem
									label={CA.fullName}
									value={fieldValues.adminFullName}
								/>
								<FieldItem label={CA.jobRole} value={company?.jobRole ?? ""} />
								<FieldItem
									label={CA.workPhoneNo}
									value={company?.workPhone ?? ""}
								/>
							</div>
							<div className="space-y-4">
								<FieldItem
									label={CA.nickname}
									value={fieldValues.adminNickname}
								/>
								<FieldItem
									label={CA.email}
									value={fieldValues.companyAdminEmail}
								/>
								<FieldItem
									label={CA.cellPhoneNo}
									value={company?.cellPhone ?? ""}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Advanced flow layout
	return (
		<div className="space-y-6">
			<Banner variant="default" title={confirmationStepCopy.noteTitle}>
				{confirmationStepCopy.noteBodyBefore}
				<strong className="text-text-foreground">{confirmAddLabel}</strong>
				{confirmationStepCopy.noteBodyAfter}
			</Banner>
			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{C.corporationInfo}
				</p>
				<div className="rounded-lg border border-border p-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<div className="space-y-4">
							<FieldItem
								label={F.corporationLegalName}
								value={fieldValues.corporationLegalName}
							/>
							<FieldItem label={F.websiteUrl} value={fieldValues.websiteUrl} />
							<FieldItem label={F.region} value={fieldValues.region} />
							<FieldItem
								label={F.corporatePhoneNo}
								value={fieldValues.corporatePhoneNo}
							/>
							<FieldItem label={F.timeZone} value={fieldValues.timeZone} />
						</div>
						<div className="space-y-4">
							<FieldItem label={F.dbaName} value={fieldValues.dbaName} />
							<FieldItem
								label={F.ownershipType}
								value={fieldValues.ownershipType}
							/>
							<FieldItem label={F.industry} value={fieldValues.industry} />
							<FieldItem label={F.address} value={fieldValues.address} />
						</div>
					</div>
				</div>
			</div>

			{corpAdmin && (
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.corporationAdminInfo}
					</p>
					<div className="rounded-lg border border-border p-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
							<div className="space-y-4">
								<FieldItem
									label={C.corporationAdminInfoFields.fullName}
									value={formatFullName(
										corpAdmin?.firstName,
										corpAdmin?.lastName,
									)}
								/>
								<FieldItem
									label={C.corporationAdminInfoFields.jobRole}
									value={corpAdmin.jobRole ?? ""}
								/>
								<FieldItem
									label={C.corporationAdminInfoFields.workPhoneNo}
									value={corpAdmin.workPhone ?? ""}
								/>
							</div>
							<div className="space-y-4">
								<FieldItem
									label={C.corporationAdminInfoFields.nickname}
									value={corpAdmin.nickname ?? ""}
								/>
								<FieldItem
									label={C.corporationAdminInfoFields.email}
									value={corpAdmin.email ?? ""}
								/>
								<FieldItem
									label={C.corporationAdminInfoFields.cellPhoneNo}
									value={corpAdmin.cellPhone ?? ""}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="space-y-2">
				<p className="text-mini font-medium text-text-secondary">
					{C.executiveSponsorInfo}
				</p>
				<div className="rounded-lg border border-border p-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<div className="space-y-4">
							<FieldItem
								label={C.executiveSponsorInfoFields.fullName}
								value={fieldValues.executiveSponsorFullName}
							/>
							<FieldItem
								label={C.executiveSponsorInfoFields.role}
								value={fieldValues.executiveSponsorJobRole}
							/>
							<FieldItem
								label={C.executiveSponsorInfoFields.workPhoneNo}
								value={fieldValues.workPhoneNo}
							/>
						</div>
						<div className="space-y-4">
							<FieldItem
								label={C.executiveSponsorInfoFields.nickname}
								value={fieldValues.executiveSponsorNickname}
							/>
							<FieldItem
								label={C.executiveSponsorInfoFields.email}
								value={fieldValues.email}
							/>
							<FieldItem
								label={C.executiveSponsorInfoFields.cellPhoneNo}
								value={fieldValues.cellPhoneNo}
							/>
						</div>
					</div>
				</div>
			</div>

			{flow === "advanced" &&
				(corporationDetail?.companies?.length ?? 0) > 0 && (
					<div className="space-y-2">
						<p className="text-mini font-medium text-text-secondary">
							{C.companies}
						</p>
						<div className="rounded-lg border border-border overflow-hidden">
							{corporationDetail?.companies?.map((company, index) => {
								const isFirst = index === 0;
								const isLast =
									index === (corporationDetail?.companies?.length ?? 0) - 1;
								const rowPadding = isFirst
									? "pt-4 pb-3 px-4"
									: isLast
										? "pt-3 pb-4 px-4"
										: "py-3 px-4";
								return (
									<Fragment key={company.id}>
										{index > 0 && <Separator />}
										<div className={rowPadding}>
											<ConfirmationCompanyRow company={company} />
										</div>
									</Fragment>
								);
							})}
						</div>
					</div>
				)}

			{showBrandingSection && (
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.branding}
					</p>
					<div className="rounded-lg border border-border p-4">
						<p className="text-mini font-medium text-text-secondary mb-2">
							{C.brandLogo}
						</p>
						<img
							src={logoDisplayUrl}
							alt="Corporation logo"
							className="h-16 w-auto max-w-[200px] object-contain"
						/>
					</div>
				</div>
			)}

			{legalComplianceContact && (
				<div className="space-y-2">
					<p className="text-mini font-medium text-text-secondary">
						{C.keyContact}
					</p>
					<div className="rounded-lg border border-border p-4">
						<FieldItem
							label={C.complianceContact}
							value={formatFullName(
								legalComplianceContact.firstName,
								legalComplianceContact.lastName,
							)}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
