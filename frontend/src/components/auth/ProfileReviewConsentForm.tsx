import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { patchUserOnboardingSteps } from "@/api";
import { DetailRow } from "@/components";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	INVITE_USER_TYPE,
	PROFILE_REVIEW_CONSENT_DETAIL_LABELS,
	PROFILE_REVIEW_CONSENT_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { useUsersStore } from "@/store";
import type { UserProfile } from "@/types";

type ConsentFormValues = {
	consentAccepted: boolean;
};

export type ProfileReviewConsentFormProps = {
	/** When set, called after successful consent PATCH instead of navigating away. */
	onConsentComplete?: () => void | Promise<void>;
};

function buildConsentDetailRows(profile: UserProfile, unavailable: string) {
	const L = PROFILE_REVIEW_CONSENT_DETAIL_LABELS;
	const showOrgRoleSections =
		profile.inviteType !== INVITE_USER_TYPE.assessmentOnly;
	const fn = profile.firstName?.trim() ?? "";
	const ln = profile.lastName?.trim() ?? "";
	const fullName = `${fn} ${ln}`.trim();
	const email =
		typeof profile.email === "string" && profile.email.trim().length > 0
			? profile.email.trim()
			: unavailable;
	const phone =
		profile.workPhone?.trim() || profile.cellPhone?.trim() || unavailable;

	const orgRows = showOrgRoleSections
		? [
				{
					label: L.parentCorporation,
					value: profile.corporation?.trim() || unavailable,
				},
				{
					label: L.companyName,
					value: profile.companyName?.trim() || unavailable,
				},
			]
		: [];

	const roleRow = showOrgRoleSections
		? [{ label: L.role, value: profile.roleName?.trim() || unavailable }]
		: [];

	return [
		...orgRows,
		{ label: L.fullName, value: fullName || unavailable },
		...roleRow,
		{ label: L.email, value: email },
		{ label: L.workPhone, value: phone },
	];
}

export function ProfileReviewConsentForm({
	onConsentComplete,
}: ProfileReviewConsentFormProps) {
	const navigate = useNavigate();
	const content = PROFILE_REVIEW_CONSENT_PAGE_CONTENT;
	const unavailable = content.valueUnavailable;

	const {
		userProfile,
		userProfileLoading,
		userProfileError,
		fetchUserProfile,
	} = useUsersStore();

	const loadState = useMemo(() => {
		if (userProfileLoading) return "loading";
		if (userProfileError && !userProfile) return "error";
		if (userProfile) return "ok";
		return "loading";
	}, [userProfile, userProfileLoading, userProfileError]);

	const {
		control,
		handleSubmit,
		watch,
		formState: { isSubmitting },
	} = useForm<ConsentFormValues>({
		defaultValues: {
			consentAccepted: false,
		},
	});

	const consentAccepted = watch("consentAccepted");

	const detailRows = useMemo(
		() => (userProfile ? buildConsentDetailRows(userProfile, unavailable) : []),
		[userProfile, unavailable],
	);

	const handleFormSubmit = async (data: ConsentFormValues) => {
		if (!data.consentAccepted) return;
		const result = await patchUserOnboardingSteps({ type: "consent" });
		if (!result.ok) {
			toast.error(result.message);
			return;
		}
		if (onConsentComplete) {
			await onConsentComplete();
			return;
		}
		navigate(ROUTES.auth.onboarding);
	};

	const handleRetryLoad = () => {
		void fetchUserProfile();
	};

	return (
		<div className="flex w-full flex-col gap-8">
			<h1 className="text-center text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
				{content.title}
			</h1>

			<div className="w-full rounded-xl border border-input bg-background px-4 pt-4 pb-0 flex flex-col gap-2">
				{loadState === "loading" ? (
					<div className="flex flex-col" role="status" aria-busy>
						{Array.from({ length: 6 }, (_, index) => (
							<div
								key={index}
								className="flex min-h-11 items-center justify-between gap-4 border-b border-border pb-3 pt-0 last:border-b-0"
							>
								<Skeleton className="h-4 w-28 shrink-0" />
								<Skeleton className="h-4 w-36 shrink-0" />
							</div>
						))}
					</div>
				) : null}

				{loadState === "error" ? (
					<div className="flex flex-col items-center gap-4 py-8">
						<p className="text-center text-small text-text-secondary">
							{content.profileLoadError}
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleRetryLoad}
						>
							{content.retryButton}
						</Button>
					</div>
				) : null}

				{loadState === "ok" && detailRows.length > 0
					? detailRows.map((detail) => (
							<DetailRow
								key={detail.label}
								label={detail.label}
								value={detail.value}
							/>
						))
					: null}
			</div>

			<form
				onSubmit={handleSubmit(handleFormSubmit)}
				className="flex w-full flex-col gap-8"
			>
				<div className="space-y-3">
					<Controller
						control={control}
						name="consentAccepted"
						render={({ field }) => (
							<div className="flex items-start gap-2">
								<Switch
									checked={Boolean(field.value)}
									onCheckedChange={field.onChange}
									aria-label={content.consentSwitchAriaLabel}
									disabled={loadState !== "ok"}
									className="mt-0.5"
								/>
								<p className="text-small font-normal leading-small text-text-foreground">
									{content.consentPrefix}{" "}
									<Link
										to={ROUTES.auth.termsOfUse}
										className="font-semibold text-link underline"
									>
										{content.termsOfUse}
									</Link>{" "}
									{content.andText}{" "}
									<Link
										to={ROUTES.auth.privacyPolicy}
										className="font-semibold text-link underline"
									>
										{content.privacyPolicy}
									</Link>
								</p>
							</div>
						)}
					/>

					<p className="text-small font-normal leading-small text-muted-foreground">
						{content.disclaimer}
					</p>
				</div>

				<Button
					type="submit"
					size="lg"
					disabled={!consentAccepted || loadState !== "ok"}
					isLoading={isSubmitting}
					className="h-10 w-full rounded-lg text-small font-semibold text-light-same"
				>
					{isSubmitting ? content.submitting : content.submitButton}
				</Button>
			</form>
		</div>
	);
}
