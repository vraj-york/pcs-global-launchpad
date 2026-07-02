import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RolesContent } from "@/components";
import { Button } from "@/components/ui/button";
import { ROLES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export const RolesPermissionsPage = () => {
	const navigate = useNavigate();
	const [navigating, setNavigating] = useState(false);

	const handleAddRole = () => {
		setNavigating(true);
		navigate(ROUTES.roles.add);
	};

	const breadcrumbs = [
		{
			label: ROLES_PAGE_CONTENT.title,
			path: ROUTES.roles.root,
		},
	];
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{ROLES_PAGE_CONTENT.title}
					</h1>
					<p className="text-small text-text-secondary">
						{ROLES_PAGE_CONTENT.subtitle}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button onClick={handleAddRole} icon={Plus} isLoading={navigating}>
						{ROLES_PAGE_CONTENT.addNewRole}
					</Button>
				</div>
			</div>
			<RolesContent />
		</AppLayout>
	);
};
