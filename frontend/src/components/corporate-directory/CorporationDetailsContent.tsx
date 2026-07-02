import {
	BSPBadge,
	DetailRow,
	ViewCompanyDetailContent,
	ViewCorporationCompaniesTab,
} from "@/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	CORPORATE_DIRECTORY_PAGE_CONTENT as C,
	CONTACT_TYPE_FILTER_OPTIONS,
	EMPTY_VALUE_PLACEHOLDER,
} from "@/const";
import type {
	CorporationDetailsContentProps,
	CorporationStatus,
} from "@/types";
import { formatAddress, formatFullName, getBrandLogoDisplayUrl } from "@/utils";

function getAppKeyContactTypeLabel(contactType: string): string {
	const match = CONTACT_TYPE_FILTER_OPTIONS.find(
		(o) => o.value === contactType,
	);
	return match?.label ?? contactType.replace(/_/g, " ");
}

function toCorporationStatus(status: string): CorporationStatus {
	const s = status?.toLowerCase();
	if (["active", "suspended", "closed", "incomplete"].includes(s))
		return s as CorporationStatus;
	return "incomplete";
}

export function CorporationDetailsContent({
	corporation,
	activeTab,
	formatCorpId,
	selectedCompanyId,
	onCompanyClick,
	onBackToCompanies,
}: CorporationDetailsContentProps) {
	const addr = corporation.address;
	const status = toCorporationStatus(corporation.status);
	const brandLogoDisplayUrl = getBrandLogoDisplayUrl(corporation.brandLogo);
	const corpAdminUser = corporation.corporationAdminAppUser;
	const execSponsor = corporation.appKeyContacts?.find(
		(c) => c.contactType === "exec_sponsor",
	);

	if (activeTab === "basic") {
		return (
			<div className="grid w-full grid-cols-1 gap-4 pb-6 lg:grid-cols-2">
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
							{C.viewCardCorporationBasics}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex w-full flex-col gap-4 px-4 pt-4 pb-4">
						<div className="flex w-full flex-col gap-3">
							<DetailRow
								label={C.viewFieldCorporationId}
								value={formatCorpId(corporation.corporationCode)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow label={C.viewFieldStatus}>
								<BSPBadge type={status} className="capitalize">
									{status}
								</BSPBadge>
							</DetailRow>
							<DetailRow
								label={C.viewFieldCorporationLegalName}
								value={corporation.legalName}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldDbaName}
								value={corporation.dbaName}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldWebsiteUrl}
								value={corporation.website}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldOwnershipType}
								value={corporation.ownershipType ?? ""}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldRegion}
								value={corporation.dataResidencyRegion}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldIndustry}
								value={corporation.industry}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldCorporatePhoneNo}
								value={corporation.phoneNo}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldAddress}
								value={formatAddress(addr)}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.viewFieldTimeZone}
								value={addr?.timezone}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>
				<div className="flex w-full flex-col gap-4">
					{corpAdminUser && (
						<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
							<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
								<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
									{C.viewCardCorporateAdmin}
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
								<div className="flex w-full flex-col gap-3">
									<DetailRow
										label={C.viewFieldFullName}
										value={formatFullName(
											corpAdminUser?.firstName,
											corpAdminUser?.lastName,
										)}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldNickname}
										value={corpAdminUser.nickname ?? ""}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldJobRole}
										value={corpAdminUser.jobRole}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldEmail}
										value={corpAdminUser.email}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldWorkPhoneNo}
										value={corpAdminUser.workPhone}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldCellPhoneNo}
										value={corpAdminUser.cellPhone ?? ""}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
								</div>
							</CardContent>
						</Card>
					)}
					{execSponsor && (
						<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
							<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
								<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
									{C.viewCardExecutiveSponsor}
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
								<div className="flex w-full flex-col gap-3">
									<DetailRow
										label={C.viewFieldFullName}
										value={formatFullName(
											execSponsor?.firstName,
											execSponsor?.lastName,
										)}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldNickname}
										value={execSponsor.nickname ?? ""}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldJobRole}
										value={execSponsor.jobRole}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldEmail}
										value={execSponsor.email}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldWorkPhoneNo}
										value={execSponsor.workPhone}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
									<DetailRow
										label={C.viewFieldCellPhoneNo}
										value={execSponsor.cellPhone ?? ""}
										emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
									/>
								</div>
							</CardContent>
						</Card>
					)}
					{!corpAdminUser && !execSponsor && (
						<Card className="bg-white shadow-sm">
							<CardContent className="py-6 text-small text-text-secondary">
								{C.viewNoAdminOrSponsor}
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		);
	}

	if (activeTab === "companies" && corporation.id) {
		if (selectedCompanyId != null && selectedCompanyId !== "") {
			return (
				<ViewCompanyDetailContent
					corporationId={corporation.id}
					initialCompanyId={selectedCompanyId}
					onBackToCompanies={onBackToCompanies ?? (() => {})}
				/>
			);
		}
		return (
			<ViewCorporationCompaniesTab
				corporationId={corporation.id}
				onCompanyClick={onCompanyClick}
			/>
		);
	}

	if (activeTab === "branding") {
		return (
			<div className="max-w-2xl">
				<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-sm">
					<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-normal text-text-foreground">
							{C.viewCardBrandLogo}
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-4 pb-6">
						{brandLogoDisplayUrl ? (
							<img
								src={brandLogoDisplayUrl}
								alt="Corporation brand logo"
								className="h-20 max-w-[200px] w-auto rounded-lg object-contain"
							/>
						) : (
							<p className="py-6 text-small text-text-secondary">
								{C.viewNoLogoUploaded}
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	if (activeTab === "contacts") {
		const contacts = corporation.appKeyContacts ?? [];
		return (
			<div className="w-full">
				{contacts.length === 0 ? (
					<Card className="w-full max-w-2xl gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
						<CardContent className="p-4">
							<p className="py-6 text-small text-text-secondary">
								{C.viewNoAppKeyContacts}
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
						{contacts.map((contact) => (
							<Card
								key={contact.id}
								className="min-w-0 w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none"
							>
								<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
									<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
										{getAppKeyContactTypeLabel(contact.contactType)}
									</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
									<div className="flex w-full flex-col gap-3">
										<DetailRow
											label={C.viewFieldFullName}
											value={formatFullName(
												contact.firstName,
												contact.lastName,
											)}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
										<DetailRow
											label={C.viewFieldNickname}
											value={contact.nickname ?? ""}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
										<DetailRow
											label={C.viewFieldJobRole}
											value={contact.jobRole}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
										<DetailRow
											label={C.viewFieldEmail}
											value={contact.email}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
										<DetailRow
											label={C.viewFieldWorkPhoneNo}
											value={contact.workPhone}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
										<DetailRow
											label={C.viewFieldCellPhoneNo}
											value={contact.cellPhone ?? ""}
											emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
										/>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		);
	}

	return null;
}
