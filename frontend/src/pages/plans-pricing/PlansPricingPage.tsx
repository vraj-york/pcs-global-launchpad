import { PlansPricingContent } from "@/components";
import { PLANS_PRICING_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export const PlansPricingPage = () => {
	const breadcrumbs = [
		{
			label: PLANS_PRICING_PAGE_CONTENT.breadcrumbLabel,
			path: ROUTES.plansPricing.root,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{PLANS_PRICING_PAGE_CONTENT.title}
				</h1>
				<p className="text-small text-text-secondary">
					{PLANS_PRICING_PAGE_CONTENT.subtitle}
				</p>
			</div>
			<PlansPricingContent />
		</AppLayout>
	);
};
