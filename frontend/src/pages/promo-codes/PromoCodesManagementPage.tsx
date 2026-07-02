import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PromoCodesManagementContent } from "@/components";
import { Button } from "@/components/ui/button";
import { PROMO_CODES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const C = PROMO_CODES_PAGE_CONTENT;

export function PromoCodesManagementPage() {
	const breadcrumbs = [
		{ label: C.breadcrumbManagement, path: ROUTES.promoCodes.root },
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{C.managementTitle}
					</h1>
					<p className="mt-2 max-w-2xl text-small leading-relaxed text-text-secondary">
						{C.managementSubtitle}
					</p>
				</div>
				<Button asChild>
					<Link to={ROUTES.promoCodes.add}>
						<Plus className="size-4" aria-hidden />
						{C.addCta}
					</Link>
				</Button>
			</div>
			<PromoCodesManagementContent />
		</AppLayout>
	);
}
