import { Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleForm } from "@/components/roles-permissions/RoleForm";
import { Button } from "@/components/ui/button";
import { ROLES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout/AppLayout";
import { useRolesStore } from "@/store";
import type { RoleFormPayload } from "@/types";

export function EditRolePage() {
	const { roleId } = useParams<{ roleId: string }>();
	const navigate = useNavigate();
	const {
		categories,
		modules,
		categoriesLoading,
		modulesLoading,
		formDataError: permissionError,
		editRoleInitialValues: initialValues,
		editRoleLoading: roleLoading,
		editRoleError: roleError,
		updateRoleLoading: isSubmitting,
		fetchRoleForEdit,
		clearEditRoleState,
		updateRole,
		fetchModulesForCategory,
	} = useRolesStore();

	useEffect(() => {
		fetchRoleForEdit(roleId ?? null);
		return () => clearEditRoleState();
	}, [roleId, fetchRoleForEdit, clearEditRoleState]);

	const loading =
		roleLoading ||
		categoriesLoading ||
		(modulesLoading && modules.length === 0);

	const handleSubmit = useCallback(
		async (payload: RoleFormPayload) => {
			if (!roleId) return;
			const success = await updateRole(roleId, payload);
			if (success) navigate(ROUTES.roles.root);
		},
		[navigate, roleId, updateRole],
	);

	const breadcrumbs = [
		{ label: ROLES_PAGE_CONTENT.title, path: ROUTES.roles.root },
		{
			label: ROLES_PAGE_CONTENT.editRoleTitle,
			path: roleId ? ROUTES.roles.editWithIdPath(roleId) : undefined,
		},
	];

	const formId = "edit-role-form";
	const showForm = !loading && !roleError && initialValues;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex flex-col">
				<PageHeader
					title={ROLES_PAGE_CONTENT.editRoleTitle}
					backLabel={ROLES_PAGE_CONTENT.back}
					onBack={() => navigate(ROUTES.roles.root)}
				>
					{showForm && (
						<Button type="submit" form={formId} isLoading={isSubmitting}>
							{ROLES_PAGE_CONTENT.saveAndUpdate}
						</Button>
					)}
				</PageHeader>
				{loading && (
					<div className="flex items-center justify-center py-12">
						<Loader2
							className="size-8 animate-spin shrink-0 text-primary"
							aria-hidden
						/>
					</div>
				)}
				{!loading && (roleError || !initialValues) && (
					<p className="text-small text-destructive">
						{roleError || ROLES_PAGE_CONTENT.roleNotFound}
					</p>
				)}
				{showForm && (
					<>
						{permissionError && (
							<p className="text-small text-destructive">{permissionError}</p>
						)}
						<RoleForm
							formId={formId}
							initialValues={initialValues}
							modules={modules}
							categories={categories}
							onSubmit={handleSubmit}
							onCategoryChange={fetchModulesForCategory}
							submitLabel={ROLES_PAGE_CONTENT.saveAndUpdate}
							isSubmitting={isSubmitting}
						/>
					</>
				)}
			</div>
		</AppLayout>
	);
}
