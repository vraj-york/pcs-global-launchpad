import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ViewPlanPricingContent } from "@/components";
import { Button } from "@/components/ui/button";
import {
	PLANS_PRICING_PAGE_CONTENT,
	PLANS_PRICING_VIEW_PAGE,
	ROUTES,
} from "@/const";
import { AppLayout } from "@/layout";
import { usePlansPricingStore } from "@/store";

export function ViewPlanPricingPage() {
	const { planTypeId } = useParams<{ planTypeId: string }>();
	const navigate = useNavigate();
	const { planTypes, loading, error, fetchPricingPlans } =
		usePlansPricingStore();

	useEffect(() => {
		fetchPricingPlans();
	}, [fetchPricingPlans]);

	const planType = useMemo(() => {
		if (!planTypeId || !planTypes) return null;
		return planTypes.find((p) => p.id === planTypeId) ?? null;
	}, [planTypeId, planTypes]);

	const breadcrumbs = [
		{
			label: PLANS_PRICING_PAGE_CONTENT.breadcrumbLabel,
			path: ROUTES.plansPricing.root,
		},
		...(planTypeId
			? [
					{
						label: PLANS_PRICING_VIEW_PAGE.breadcrumbViewDetails,
						path: ROUTES.plansPricing.viewWithIdPath(planTypeId),
					},
				]
			: []),
	];

	const isLoading = loading;
	const isError = !isLoading && (Boolean(error) || !planTypeId || !planType);
	const errorDisplay =
		error ??
		(!planTypeId || !planType ? PLANS_PRICING_VIEW_PAGE.notFound : null);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 shrink-0 animate-spin text-primary"
						aria-hidden
					/>
				</div>
			)}
			{!isLoading && isError && (
				<>
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{errorDisplay}
					</div>
					<Button
						variant="link"
						className="mt-4"
						onClick={() => navigate(ROUTES.plansPricing.root)}
					>
						{PLANS_PRICING_PAGE_CONTENT.breadcrumbLabel}
					</Button>
				</>
			)}
			{!isLoading && !isError && planType && (
				<ViewPlanPricingContent planType={planType} />
			)}
		</AppLayout>
	);
}
