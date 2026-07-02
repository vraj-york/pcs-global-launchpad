import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLoader } from "@/components/common/AppLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleForm } from "@/components/roles-permissions/RoleForm";
import { Button } from "@/components/ui/button";
import { ROLES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout/AppLayout";
import { useRolesStore } from "@/store";
import type { RoleFormPayload } from "@/types";

const breadcrumbs = [
	{ label: ROLES_PAGE_CONTENT.title, path: ROUTES.roles.root },
	{ label: ROLES_PAGE_CONTENT.addNewRoleTitle, path: ROUTES.roles.add },
];

export function AddRolePage() {
	const navigate = useNavigate();
	const {
		categories,
		modules,
		categoriesLoading,
		modulesLoading,
		formDataError: permissionError,
		fetchRoleFormData,
		createRole,
		createRoleLoading: isSubmitting,
		fetchModulesForCategory,
	} = useRolesStore();

	useEffect(() => {
		fetchRoleFormData();
	}, [fetchRoleFormData]);

	const loading = categoriesLoading || (modulesLoading && modules.length === 0);

	const handleSubmit = useCallback(
		async (payload: RoleFormPayload) => {
			const success = await createRole(payload);
			if (success) navigate(ROUTES.roles.root);
		},
		[navigate, createRole],
	);

	const formId = "add-role-form";

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex flex-col">
				<PageHeader
					title={ROLES_PAGE_CONTENT.addNewRoleTitle}
					backLabel={ROLES_PAGE_CONTENT.back}
					onBack={() => navigate(ROUTES.roles.root)}
				>
					{!loading && (
						<Button type="submit" form={formId} isLoading={isSubmitting}>
							{ROLES_PAGE_CONTENT.saveAndAddRole}
						</Button>
					)}
				</PageHeader>
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<AppLoader />
					</div>
				) : (
					<>
						{permissionError && (
							<p className="text-small text-destructive">{permissionError}</p>
						)}
						<RoleForm
							formId={formId}
							modules={modules}
							categories={categories}
							onSubmit={handleSubmit}
							onCategoryChange={fetchModulesForCategory}
							submitLabel={ROLES_PAGE_CONTENT.saveAndAddRole}
							isSubmitting={isSubmitting}
						/>
					</>
				)}
			</div>
		</AppLayout>
	);
}
