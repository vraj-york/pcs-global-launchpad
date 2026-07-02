import { BSPBadge, DetailRow } from "@/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	EMPTY_VALUE_PLACEHOLDER,
	INVITE_USER_TYPE,
	VIEW_USER_DETAILS_PAGE as V,
} from "@/const";
import type { UserDetails, ViewUserDetailsContentProps } from "@/types";
import { formatCode, formatFullName } from "@/utils";

function corporationDisplay(u: UserDetails): string | null {
	if (!u.corporation) return null;
	const code = formatCode(u.corporation.corporationCode, "CORP");
	return `${u.corporation.legalName} (${code})`;
}

export function ViewUserDetailsContent({ user }: ViewUserDetailsContentProps) {
	const corpLine = corporationDisplay(user);
	const companyLine = user.company?.legalName?.trim() ?? null;
	const showOrgRoleSections =
		user.inviteType !== INVITE_USER_TYPE.assessmentOnly;

	return (
		<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
			<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
				<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
					<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
						{V.cardBasicInfo}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
					<div className="flex w-full flex-col gap-3">
						<DetailRow
							label={V.fieldUserId}
							value={formatCode(user.userCode, "USER")}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow label={V.fieldStatus}>
							<BSPBadge type={user.status} className="capitalize">
								{user.status}
							</BSPBadge>
						</DetailRow>
						<DetailRow
							label={V.fieldFullName}
							value={formatFullName(user.firstName, user.lastName)}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={V.fieldNickname}
							value={
								user.nickname?.trim()
									? user.nickname.trim()
									: EMPTY_VALUE_PLACEHOLDER
							}
						/>
						<DetailRow
							label={V.fieldEmail}
							value={user.email}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={V.fieldWorkPhone}
							value={user.workPhone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={V.fieldCellPhone}
							value={user.cellPhone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={V.fieldTimezone}
							value={user.timezone}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
						<DetailRow
							label={V.fieldCreatedOn}
							value={user.createdOn}
							emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
						/>
					</div>
				</CardContent>
			</Card>

			{showOrgRoleSections && (
				<div className="flex min-w-0 flex-col gap-4">
					<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
						<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
							<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
								{V.cardCorporationCompany}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
							<div className="flex w-full flex-col gap-3">
								<DetailRow
									label={V.fieldCorporation}
									value={corpLine}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={V.fieldCompany}
									value={companyLine}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
						<CardHeader className="flex h-14 w-full items-center border-b border-border p-4 !pb-4">
							<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
								{V.cardRoleTeam}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-0">
							<div className="flex w-full flex-col gap-3">
								<DetailRow
									label={V.fieldCategory}
									value={user.category}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={V.fieldRoleName}
									value={user.roleName}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
