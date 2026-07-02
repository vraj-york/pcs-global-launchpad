import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { WhiteBox } from "@/components";
import {
	BasicInfoStep,
	BrandingStep,
	CompanySetupStep,
	KeyContactsStep,
} from "@/components/corporate-directory/add-corporation-steps";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ADD_NEW_CORPORATION_CONTENT as ADD_CORP_CONTENT } from "@/const";
import { useCorporationsStore } from "@/store";
import type { CorporationEditContentProps } from "@/types";

export function CorporationEditContent({
	corporation,
	activeTab,
	onCancelEdit,
}: CorporationEditContentProps) {
	const { corporationId } = useParams<{ corporationId: string }>();
	const {
		fetchCorporationById,
		deleteCompany,
		isLoading,
		corporationDetailLoading,
	} = useCorporationsStore();
	const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(
		null,
	);

	const id = corporationId ?? "";

	const handleBasicInfoSuccess = () => {
		if (id) fetchCorporationById(id);
		toast.success(ADD_CORP_CONTENT.toast.corporationUpdated);
	};

	const handleKeyContactsSuccess = () => {
		if (id) fetchCorporationById(id);
		toast.success(ADD_CORP_CONTENT.toast.keyContactUpdated);
	};

	const handleDeleteCompany = async (companyId: string) => {
		if (!id) return;
		setDeletingCompanyId(companyId);
		try {
			await deleteCompany(id, companyId);
		} finally {
			setDeletingCompanyId(null);
		}
	};
	return (
		<WhiteBox
			padding="md"
			className="relative flex flex-1 flex-col min-h-0 w-full max-h-[calc(100vh-12rem)] overflow-hidden"
		>
			<div className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden">
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-col gap-6">
						{activeTab === "basic" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{ADD_CORP_CONTENT.basicInfo.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{ADD_CORP_CONTENT.basicInfo.subtitle}
									</p>
								</div>
								<BasicInfoStep
									mode="advanced"
									corporationDetail={corporation}
									isLoadingDetail={corporationDetailLoading}
									onSuccess={handleBasicInfoSuccess}
								/>
							</>
						)}
						{activeTab === "companies" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{ADD_CORP_CONTENT.advancedSteps.companySetup.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{ADD_CORP_CONTENT.advancedSteps.companySetup.subtitle}
									</p>
								</div>
								<CompanySetupStep
									corporationDetail={corporation}
									deletingCompanyId={deletingCompanyId}
									isLoadingCompanies={corporationDetailLoading}
									onDeleteCompany={handleDeleteCompany}
								/>
							</>
						)}
						{activeTab === "branding" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{ADD_CORP_CONTENT.advancedSteps.branding.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{ADD_CORP_CONTENT.advancedSteps.branding.subtitle}
									</p>
								</div>
								<BrandingStep
									corporationId={id}
									corporationDetail={corporation}
									isLoadingDetail={corporationDetailLoading}
								/>
							</>
						)}
						{activeTab === "contacts" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{ADD_CORP_CONTENT.advancedSteps.keyContact.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{ADD_CORP_CONTENT.advancedSteps.keyContact.subtitle}
									</p>
								</div>
								<KeyContactsStep
									corporationDetail={corporation}
									isLoadingDetail={corporationDetailLoading}
									onSuccess={handleKeyContactsSuccess}
								/>
							</>
						)}
					</div>
					<div className="mt-auto shrink-0 -mx-6 pt-5">
						<Separator />
						<div className="flex flex-wrap items-center justify-end gap-4 px-6 pt-4">
							<Button
								variant="outline"
								onClick={onCancelEdit}
								className="border-border text-text-foreground"
							>
								{ADD_CORP_CONTENT.buttons.cancel}
							</Button>
							{(activeTab === "basic" || activeTab === "contacts") && (
								<Button
									type="submit"
									form={
										activeTab === "basic"
											? "basic-info-form"
											: "key-contacts-form"
									}
									isLoading={isLoading}
								>
									{ADD_CORP_CONTENT.advancedSteps.companySetup.saveAndUpdate}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</WhiteBox>
	);
}
