import { CircleCheckBig, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromoCodeFormValidationFooterProps } from "@/types";

export function PromoCodeFormValidationFooter({
	serverValidated,
	validationSuccessTitle,
	validationSuccessBody,
	validationBannerTitle,
	validationBannerBody,
	validateCta,
	onValidate,
	cancelLabel,
	onCancel,
	submitDisabled,
	submitTitleHint,
	submitIdleLabel,
	isSubmitting,
	submittingLabel,
}: PromoCodeFormValidationFooterProps) {
	return (
		<div className="space-y-4 pt-6">
			{serverValidated ? (
				<div className="flex flex-col gap-2 rounded-lg border border-border bg-success-bg px-5 py-4">
					<div className="flex min-w-0 items-center gap-3">
						<CircleCheckBig
							className="size-6 shrink-0 text-icon-success"
							aria-hidden
						/>
						<p className="min-w-0 text-sm font-semibold text-success-text">
							{validationSuccessTitle}
						</p>
					</div>
					<p className="pl-9 text-sm leading-relaxed text-success-text/90">
						{validationSuccessBody}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-4 rounded-lg border border-border bg-info-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
					<div className="flex min-w-0 gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center text-interactive-primary">
							<Info className="size-4" aria-hidden />
						</div>
						<div className="min-w-0 space-y-1 text-sm leading-relaxed">
							<p className="font-semibold text-text-foreground">
								{validationBannerTitle}
							</p>
							<p className="text-muted-foreground">{validationBannerBody}</p>
						</div>
					</div>
					<Button
						type="button"
						variant="default"
						icon={CircleCheckBig}
						className="shrink-0 bg-interactive-primary text-primary-foreground hover:bg-interactive-primary-hover"
						onClick={() => void onValidate()}
					>
						{validateCta}
					</Button>
				</div>
			)}

			<div className="flex justify-end gap-3 pt-2">
				<Button
					type="button"
					variant="outline"
					className="min-w-24"
					onClick={onCancel}
				>
					{cancelLabel}
				</Button>
				<Button
					type="submit"
					disabled={submitDisabled}
					isLoading={isSubmitting}
					title={submitTitleHint}
					className="min-w-36 font-medium shadow-sm"
				>
					{isSubmitting ? submittingLabel : submitIdleLabel}
				</Button>
			</div>
		</div>
	);
}
