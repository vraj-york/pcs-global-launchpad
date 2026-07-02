import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
	getIndividualPaymentReview,
	postIndividualPaymentCheckoutSession,
} from "@/api";
import {
	AppLoader,
	BSPLogo,
	PlanPriceBreakdownCard,
	ReviewField,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	COMPANY_ADMIN_ONBOARDING,
	INDIVIDUAL_PAYMENT_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { useIndividualPaymentGate } from "@/hooks";
import { captureStripeCheckoutStarted } from "@/lib";
import { useSubscriptionAccessStore } from "@/store";
import type { IndividualPaymentReview } from "@/types";
import { toFiniteNonNegative } from "@/utils";

const C = INDIVIDUAL_PAYMENT_PAGE_CONTENT;
const MAX_PAYMENT_ACTIVATION_POLLS = 12;
const PAYMENT_ACTIVATION_POLL_MS = 1000;

export function IndividualPaymentFlow() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { refresh } = useIndividualPaymentGate();
	const [review, setReview] = useState<IndividualPaymentReview | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [loading, setLoading] = useState(true);
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [activatingPayment, setActivatingPayment] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setLoadError(false);
		getIndividualPaymentReview().then((result) => {
			if (cancelled) return;
			if (!result.ok) {
				setLoadError(true);
				setReview(null);
				setLoading(false);
				return;
			}
			if (result.data.hasPaid) {
				void refresh().then(() => {
					if (!cancelled) {
						navigate(ROUTES.assessment.root, { replace: true });
					}
				});
				return;
			}
			setReview(result.data);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [navigate, refresh]);

	useEffect(() => {
		const sessionId = searchParams.get("session_id");
		if (!sessionId || activatingPayment) {
			return;
		}

		let cancelled = false;
		let attempts = 0;

		const clearSessionQuery = () => {
			const next = new URLSearchParams(searchParams);
			next.delete("session_id");
			setSearchParams(next, { replace: true });
		};

		const pollActivation = async () => {
			setActivatingPayment(true);
			while (!cancelled && attempts < MAX_PAYMENT_ACTIVATION_POLLS) {
				attempts += 1;
				await refresh();
				const accessData = useSubscriptionAccessStore.getState().data;
				const stillRequired = Boolean(
					accessData?.isIndividualUser && accessData.paymentRequired,
				);
				if (accessData && !stillRequired) {
					await refresh();
					clearSessionQuery();
					navigate(ROUTES.assessment.root, { replace: true });
					return;
				}
				await new Promise((resolve) =>
					setTimeout(resolve, PAYMENT_ACTIVATION_POLL_MS),
				);
			}
			if (!cancelled) {
				await refresh();
				clearSessionQuery();
				setActivatingPayment(false);
				toast.message(
					"Payment received. Refresh if assessment access is not available yet.",
				);
			}
		};

		void pollActivation();

		return () => {
			cancelled = true;
		};
	}, [activatingPayment, navigate, refresh, searchParams, setSearchParams]);

	if (loading || activatingPayment) {
		return <AppLoader className="min-h-[calc(100vh-8rem)]" />;
	}

	if (loadError || !review) {
		return (
			<p className="text-center text-sm text-destructive">{C.loadError}</p>
		);
	}

	const planSummary = review.planSummary;
	const pricing = planSummary?.pricing;
	const planPriceAmount = toFiniteNonNegative(pricing?.planPrice);
	const discountAmount = toFiniteNonNegative(pricing?.discount);
	const invoiceAmount = toFiniteNonNegative(pricing?.invoiceAmount);

	const handleProceedToPayment = async () => {
		if (!review.canCheckout) {
			toast.error(C.checkoutDisabled);
			return;
		}
		setCheckoutLoading(true);
		try {
			captureStripeCheckoutStarted({
				plan_type_id: planSummary?.planTypeId,
			});
			const res = await postIndividualPaymentCheckoutSession();
			if (!res.ok) {
				toast.error(res.message);
				return;
			}
			window.location.href = res.data.url;
		} finally {
			setCheckoutLoading(false);
		}
	};

	const handleDiscard = () => {
		toast.info(
			"You can return to complete payment from the dashboard when you are ready.",
		);
	};

	return (
		<div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center px-0 sm:px-2">
			<div className="w-full max-w-3xl">
				<div className="mb-8 flex justify-center">
					<BSPLogo variant="app" />
				</div>

				<Card className="w-full rounded-xl border border-border bg-background shadow-md">
					<CardHeader className="space-y-2 text-center">
						<CardTitle className="text-heading-4 font-semibold text-text-foreground">
							{review.title}
						</CardTitle>
						<CardDescription className="text-small font-normal text-text-secondary">
							{review.subtitle}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{planSummary ? (
							<section className="space-y-2">
								<h3 className="text-mini font-medium tracking-wider text-text-secondary">
									{C.planInfoLabel}
								</h3>
								<div className="space-y-4 rounded-xl border border-border bg-background p-4">
									<div className="flex flex-wrap items-start gap-4">
										<div className="w-56">
											<ReviewField
												label={C.promoCodeLabel}
												value={
													pricing?.promoCode ??
													COMPANY_ADMIN_ONBOARDING.notProvided
												}
											/>
										</div>
										<div className="w-56">
											<ReviewField
												label={C.billingCurrencyLabel}
												value={pricing?.billingCurrency ?? "USD ($)"}
											/>
										</div>
									</div>

									<PlanPriceBreakdownCard
										planPrice={planPriceAmount}
										discount={discountAmount}
										promoCodeApplied={pricing?.promoCode}
										implementationFee={0}
										subTotal={Math.max(0, planPriceAmount - discountAmount)}
										invoiceAmount={invoiceAmount}
										onsiteTrainingOption="off"
										onsiteTrainingFeeAmount={0}
										hideAddonFees
									/>
								</div>
							</section>
						) : (
							<p className="text-center text-muted-foreground">
								{COMPANY_ADMIN_ONBOARDING.noPlanBody}
							</p>
						)}

						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={handleDiscard}>
								{C.discardButton}
							</Button>
							<Button
								type="button"
								onClick={() => void handleProceedToPayment()}
								disabled={
									!review.canCheckout || checkoutLoading || !planSummary
								}
							>
								{checkoutLoading
									? COMPANY_ADMIN_ONBOARDING.proceeding
									: C.proceedToPaymentButton}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
