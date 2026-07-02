import { toast } from "sonner";
import {
	BasicInfoStep,
	CompanyViewPlanSeatsTab,
	ConfigurationStep,
	KeyContactsStep,
	PlanAndSeatsStep,
	WhiteBox,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ADD_NEW_COMPANY_CONTENT } from "@/const";
import { useCompanyDirectoryStore } from "@/store";
import type { CompanyEditContentProps } from "@/types";

const content = ADD_NEW_COMPANY_CONTENT;

export function CompanyEditContent({
	company,
	activeTab,
	onCancelEdit,
}: CompanyEditContentProps) {
	const { fetchCompanyById, companyActionLoading } = useCompanyDirectoryStore();
	const companyId = company.id;
	const isPlanEditRestricted =
		company.subscriptionStatus?.trim().toLowerCase() === "active";

	const handleSuccess = () => {
		if (companyId) void fetchCompanyById(companyId);
		toast.success(content.toast.companyUpdated);
	};

	const showSaveButton =
		(activeTab === "basic" ||
			activeTab === "keyContacts" ||
			activeTab === "planSeats" ||
			activeTab === "branding" ||
			activeTab === "configuration") &&
		!(activeTab === "planSeats" && isPlanEditRestricted);

	const saveFormId =
		activeTab === "basic"
			? "add-company-basic-info-form"
			: activeTab === "keyContacts"
				? "add-company-key-contacts-form"
				: activeTab === "planSeats"
					? "add-company-plan-seats-form"
					: activeTab === "branding" || activeTab === "configuration"
						? "add-company-configuration-form"
						: undefined;

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
										{content.basicInfo.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{content.basicInfo.subtitle}
									</p>
								</div>
								<BasicInfoStep
									companyId={companyId}
									onSuccess={handleSuccess}
								/>
							</>
						)}
						{activeTab === "keyContacts" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{content.keyContacts.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{content.keyContacts.subtitle}
									</p>
								</div>
								<KeyContactsStep
									companyId={companyId}
									onSuccess={handleSuccess}
								/>
							</>
						)}
						{activeTab === "planSeats" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{content.planAndSeats.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{content.planAndSeats.subtitle}
									</p>
								</div>
								{isPlanEditRestricted ? (
									<CompanyViewPlanSeatsTab
										company={company}
										showManageInBillingCta
									/>
								) : (
									<PlanAndSeatsStep
										companyId={companyId}
										onSuccess={handleSuccess}
									/>
								)}
							</>
						)}
						{activeTab === "branding" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{content.configuration.branding.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{content.configuration.branding.noteDescription}
									</p>
								</div>
								<ConfigurationStep
									companyId={companyId}
									section="branding"
									onSuccess={handleSuccess}
								/>
							</>
						)}
						{activeTab === "configuration" && (
							<>
								<div>
									<h2 className="text-heading-4 font-semibold text-text-foreground">
										{content.configuration.generalSettings.title}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{content.configuration.subtitle}
									</p>
								</div>
								<ConfigurationStep
									companyId={companyId}
									section="general"
									onSuccess={handleSuccess}
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
								{content.buttons.cancel}
							</Button>
							{showSaveButton && saveFormId && (
								<Button
									type="submit"
									form={saveFormId}
									isLoading={companyActionLoading}
								>
									{content.buttons.saveAndUpdate}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</WhiteBox>
	);
}
