import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteBrandLogo, uploadBrandLogo } from "@/api";
import { FileUploadArea } from "@/components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	ADD_NEW_CORPORATION_CONTENT,
	BRAND_LOGO_ALLOWED_TYPES,
	BRAND_LOGO_MAX_SIZE_BYTES,
} from "@/const";
import { useCorporationsStore } from "@/store";
import type { BrandingStepProps } from "@/types";
import { getBrandLogoDisplayUrl } from "@/utils/sharedUtils";

const brandingContent = ADD_NEW_CORPORATION_CONTENT.branding;

const brandLogoValidationOptions = {
	maxSizeBytes: BRAND_LOGO_MAX_SIZE_BYTES,
	allowedMimeTypes: BRAND_LOGO_ALLOWED_TYPES,
	messageUnsupportedFormat: brandingContent.errors.unsupportedFormat,
	messageFileTooLarge: brandingContent.errors.fileTooLarge,
};

export function BrandingStep({
	corporationId,
	corporationDetail,
	isLoadingDetail,
}: BrandingStepProps) {
	const [uploading, setUploading] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
	const { fetchCorporationById } = useCorporationsStore();

	const logoUrl = corporationDetail?.brandLogo ?? lastUploadedUrl ?? null;
	const logoDisplayUrl = getBrandLogoDisplayUrl(logoUrl);

	async function doUpload(file: File) {
		setUploading(true);
		const result = await uploadBrandLogo(corporationId, file);
		setUploading(false);

		if (result.ok && result.data?.data?.brandLogo) {
			setLastUploadedUrl(result.data.data.brandLogo);
			setValidationError(null);
			toast.success(result.data?.message);
			await fetchCorporationById(corporationId);
			return;
		}
		// 403 from backend or WAF/network failure (status 0) – show same user-friendly message
		const isForbiddenOrBlocked =
			!result.ok &&
			"status" in result &&
			(result.status === 403 || result.status === 0);
		const message = isForbiddenOrBlocked
			? brandingContent.errors.uploadForbidden
			: !result.ok && "message" in result
				? result.message
				: brandingContent.errors.uploadFailed;
		setValidationError(message);
		toast.error(message);
	}

	const handleRemoveLogo = async () => {
		if (!logoUrl) return;
		setRemoving(true);
		const result = await deleteBrandLogo(corporationId);
		setRemoving(false);

		if (result.ok) {
			setLastUploadedUrl(null);
			toast.success(result.data?.message);
			await fetchCorporationById(corporationId);
			setValidationError(null);
			return;
		}

		const message =
			!result.ok && "message" in result
				? result.message
				: brandingContent.errors.removeFailed;
		toast.error(message);
	};

	if (isLoadingDetail && !corporationDetail) {
		return (
			<p className="text-small text-muted-foreground">
				{ADD_NEW_CORPORATION_CONTENT.loadingDetail}
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<p className="text-sm font-medium text-text-foreground">
				{brandingContent.uploadTitle}
			</p>

			<FileUploadArea
				onUpload={doUpload}
				validationOptions={brandLogoValidationOptions}
				uploadLabel={brandingContent.uploadLabel}
				uploadHint={brandingContent.uploadHint}
				accept=".png,.jpg,.jpeg,image/png,image/jpeg,image/jpg"
				isUploading={uploading}
				onValidationError={(err) => {
					setValidationError(err ?? null);
					if (err) toast.error(err);
				}}
				ariaLabel={brandingContent.uploadLabel}
				className="rounded-lg"
			/>

			{validationError && (
				<p className="text-small text-destructive" role="alert">
					{validationError}
				</p>
			)}

			{/* Logo preview: square card, light grey border, 300×300 per design */}
			{logoDisplayUrl && (
				<Card className="flex size-72 flex-col items-center justify-center rounded-lg border border-border bg-white p-6">
					<div className="relative flex size-64 items-center justify-center overflow-hidden rounded-lg bg-white group">
						<img
							src={logoDisplayUrl}
							alt="Corporation logo"
							className="max-h-full max-w-full object-contain"
							crossOrigin="anonymous"
							referrerPolicy="no-referrer"
							onError={() => {
								toast.error(brandingContent.errors.imageLoadFailed);
							}}
						/>
						<Button
							type="button"
							variant="ghost"
							aria-label={brandingContent.removeLogo}
							onClick={(e: React.MouseEvent) => {
								e.preventDefault();
								handleRemoveLogo();
							}}
							className="absolute inset-0 size-full rounded-lg border-0 p-0 font-normal shadow-none bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 hover:text-white focus-visible:ring-0"
							icon={Trash2}
							isLoading={removing}
						/>
					</div>
				</Card>
			)}
		</div>
	);
}
