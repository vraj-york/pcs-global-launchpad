import { Banner } from "@/components/ui/banner";
import type { PromoCodePromotionEnableWarningProps } from "@/types";

export function PromoCodePromotionEnableWarning({
	title,
	body,
	className,
}: PromoCodePromotionEnableWarningProps) {
	return (
		<Banner variant="warning" title={title} className={className} role="note">
			{body}
		</Banner>
	);
}
