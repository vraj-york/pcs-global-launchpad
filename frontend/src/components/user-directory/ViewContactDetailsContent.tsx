import { BSPBadge, DetailRow } from "@/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	VIEW_CONTACT_DETAILS_PAGE as C,
	CONTACT_TYPE_FILTER_OPTIONS,
	EMPTY_VALUE_PLACEHOLDER,
} from "@/const";
import type {
	KeyContactDetails,
	ViewContactDetailsContentProps,
} from "@/types";
import { formatCode, formatFullName } from "@/utils";

function contactTypeBadgeKey(displayOrValue: string | null): string {
	if (!displayOrValue?.trim()) return "default";
	const t = displayOrValue.trim();
	const byValue = CONTACT_TYPE_FILTER_OPTIONS.find(
		(o) => o.value !== "all" && o.value === t,
	);
	if (byValue) return byValue.value;
	const byLabel = CONTACT_TYPE_FILTER_OPTIONS.find((o) => o.label === t);
	if (byLabel && byLabel.value !== "all") return byLabel.value;
	return "default";
}

function contactTypeDisplayLabel(raw: string): string {
	const t = raw.trim();
	const byValue = CONTACT_TYPE_FILTER_OPTIONS.find(
		(o) => o.value !== "all" && o.value === t,
	);
	if (byValue) return byValue.label;
	return t;
}

function corporationDisplay(c: KeyContactDetails): string | null {
	if (!c.corporation) return null;
	const code = formatCode(c.corporation.corporationCode, "CORP");
	return `${c.corporation.legalName} (${code})`;
}

export function ViewContactDetailsContent({
	contact,
}: ViewContactDetailsContentProps) {
	const corpLine = corporationDisplay(contact);
	const companyLine = contact.company?.legalName?.trim() ?? null;

	return (
		<div className="mt-6 grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
			<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
					<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
						{C.cardBasicInfo}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
					<div className="flex w-full flex-col gap-3">
						<DetailRow
							label={C.fieldContactId}
							value={formatCode(contact.contactCode, "CNT")}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldFullName}
							value={formatFullName(contact.firstName, contact.lastName)}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldNickname}
							value={
								contact.nickname?.trim()
									? contact.nickname.trim()
									: EMPTY_VALUE_PLACEHOLDER
							}
						/>
						<DetailRow
							label={C.fieldEmail}
							value={contact.email}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldWorkPhone}
							value={contact.workPhone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldCellPhone}
							value={contact.cellPhone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldTimezone}
							value={contact.timezone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={C.fieldCreatedOn}
							value={contact.createdOn}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex min-w-0 flex-col gap-4">
				<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
							{C.cardCorporationCompany}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<DetailRow
								label={C.fieldCorporation}
								value={corpLine}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
							<DetailRow
								label={C.fieldCompany}
								value={companyLine}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>

				<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
					<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
						<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
							{C.cardRoleTeam}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
						<div className="flex w-full flex-col gap-3">
							<DetailRow label={C.fieldContactType}>
								<BSPBadge type={contactTypeBadgeKey(contact.contactType)}>
									{contactTypeDisplayLabel(contact.contactType)}
								</BSPBadge>
							</DetailRow>
							<DetailRow
								label={C.fieldJobRole}
								value={contact.jobRole}
								emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
