import { Building2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import {
	CompanyCard,
	CompanyCardSkeleton,
} from "@/components/corporate-directory/CompanyCard";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ADD_NEW_CORPORATION_CONTENT } from "@/const";
import type {
	CompanyCardDisplay,
	CompanySetupStepProps,
	CorporationDetailCompany,
} from "@/types";
import { formatFullName, formatPlanEmployeeRange } from "@/utils";
import { CompanyFormPanel } from "./CompanyFormPanel";

const COMPANY_SETUP = ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup;

function toCompanyCardDisplay(
	c: CorporationDetailCompany,
	region: string | null | undefined,
): CompanyCardDisplay {
	const plan = c.plan;
	const planLabel = plan?.planType?.name ?? "—";
	const planEmployeeLabel = formatPlanEmployeeRange(
		plan?.employeeRangeMin,
		plan?.employeeRangeMax,
	);
	const detailLine1 =
		[c.companyType, region ?? c.country].filter(Boolean).join(" • ") || "—";
	const companyAdminName = formatFullName(c?.firstName, c?.lastName);
	const detailLine2 =
		companyAdminName && c.email
			? `${companyAdminName} (${c.email})`
			: (c.email ?? "—");
	return {
		id: c.id,
		legalName: c.legalName,
		planLabel,
		planEmployeeLabel,
		planType: plan?.planTypeId ?? "",
		showEmployeeBadge: plan != null,
		detailLine1,
		detailLine2,
	};
}

export function CompanySetupStep({
	corporationDetail,
	onAddCompany,
	onEditCompany,
	onDeleteCompany,
	deletingCompanyId,
	isLoadingCompanies,
	onFormPanelOpenChange,
}: CompanySetupStepProps) {
	const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
	const [addingNew, setAddingNew] = useState(false);
	const [companyIdToDelete, setCompanyIdToDelete] = useState<string | null>(
		null,
	);
	const prevDeletingIdRef = useRef<string | null>(null);

	const isFormPanelOpen = Boolean(editingCompanyId || addingNew);
	useEffect(() => {
		onFormPanelOpenChange?.(isFormPanelOpen);
	}, [isFormPanelOpen, onFormPanelOpenChange]);

	const companies = corporationDetail?.companies ?? [];
	const isDeleteInProgress =
		companyIdToDelete != null && deletingCompanyId === companyIdToDelete;

	useEffect(() => {
		if (prevDeletingIdRef.current !== null && deletingCompanyId === null) {
			setCompanyIdToDelete(null);
		}
		prevDeletingIdRef.current = deletingCompanyId ?? null;
	}, [deletingCompanyId]);
	const count = companies.length;
	const editingCompany = editingCompanyId
		? (companies.find((c) => c.id === editingCompanyId) ?? null)
		: null;

	const handleBack = () => {
		setEditingCompanyId(null);
		setAddingNew(false);
	};

	const handleDiscard = () => {
		handleBack();
	};

	const handleSave = () => {
		handleBack();
	};

	if (editingCompanyId && editingCompany) {
		return (
			<CompanyFormPanel
				mode="edit"
				company={editingCompany}
				corporationDetail={corporationDetail}
				onBack={handleBack}
				onDiscard={handleDiscard}
				onSave={handleSave}
			/>
		);
	}

	if (addingNew) {
		return (
			<CompanyFormPanel
				mode="add"
				corporationDetail={corporationDetail}
				onBack={handleBack}
				onDiscard={handleDiscard}
				onSave={handleSave}
			/>
		);
	}

	return (
		<div className="flex w-full shrink-0 flex-col gap-4">
			{count > 0 && (
				<p className="text-sm font-normal text-text-secondary">
					{isLoadingCompanies ? (
						<Skeleton className="h-5 w-32" aria-hidden />
					) : (
						COMPANY_SETUP.companiesCountLabel(count)
					)}
				</p>
			)}

			<Banner variant="default" title={COMPANY_SETUP.alertTitle}>
				{COMPANY_SETUP.alertBody}
			</Banner>

			<div className="flex flex-col gap-2">
				{isLoadingCompanies ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 2 }).map((_, i) => (
							<CompanyCardSkeleton key={`skeleton-${i}`} variant="edit" />
						))}
					</div>
				) : companies.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center">
						<p className="text-sm font-medium text-text-foreground">
							{COMPANY_SETUP.noCompaniesTitle}
						</p>
						<p className="max-w-sm text-sm text-muted-foreground">
							{COMPANY_SETUP.addOneCompanyRequired}
						</p>
					</div>
				) : (
					companies.map((company) => (
						<CompanyCard
							key={company.id}
							variant="edit"
							company={toCompanyCardDisplay(
								company,
								corporationDetail?.dataResidencyRegion,
							)}
							onEdit={(id) => {
								setEditingCompanyId(id);
								onEditCompany?.(id);
							}}
							onDelete={(id) => setCompanyIdToDelete(id)}
						/>
					))
				)}

				<ConfirmationModal
					open={companyIdToDelete != null}
					onOpenChange={(open) => {
						if (!open) setCompanyIdToDelete(null);
					}}
					title={COMPANY_SETUP.deleteDialog.title}
					description={COMPANY_SETUP.deleteDialog.description}
					icon={<Building2 className="text-destructive size-12" aria-hidden />}
					confirmLabel={COMPANY_SETUP.deleteDialog.confirm}
					cancelLabel={COMPANY_SETUP.deleteDialog.cancel}
					onConfirm={() => {
						if (companyIdToDelete) onDeleteCompany?.(companyIdToDelete);
					}}
					isConfirming={isDeleteInProgress}
					variant="destructive"
					confirmIcon={Trash2}
				/>

				<div className="sticky bottom-0 z-10 bg-background pt-2">
					<Button
						type="button"
						variant="outline"
						icon={Plus}
						disabled={isLoadingCompanies}
						onClick={() => {
							setAddingNew(true);
							onAddCompany?.();
						}}
						className="w-full border-1 border-dashed border-ring bg-background font-semibold text-brand-primary hover:bg-muted/50"
						aria-label={COMPANY_SETUP.addNewCompany}
					>
						{COMPANY_SETUP.addNewCompany}
					</Button>
				</div>
			</div>
		</div>
	);
}
