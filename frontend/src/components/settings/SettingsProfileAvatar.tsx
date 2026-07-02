import { Loader2, Trash2, Upload, UserRound } from "lucide-react";
import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SETTINGS_AVATAR_VALIDATION, SETTINGS_PAGE_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import type { SettingsProfileAvatarProps } from "@/types";
import { getUserInitials, validateFile } from "@/utils";

const C = SETTINGS_PAGE_CONTENT;
const V = SETTINGS_AVATAR_VALIDATION;

export function SettingsProfileAvatar({
	avatarUrl,
	firstName,
	lastName,
	isUploading,
	isRemoving,
	onUpload,
	onRemove,
	onValidationError,
}: SettingsProfileAvatarProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const initials = getUserInitials(firstName, lastName);
	const avatarBusy = isUploading || isRemoving;

	const handleChooseFile = () => {
		if (avatarBusy) return;
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const err = validateFile(file, {
			maxSizeBytes: V.maxFileSizeBytes,
			allowedMimeTypes: [...V.allowedMimeTypes],
			allowedExtensions: [...V.allowedExtensions],
			messageUnsupportedFormat: V.unsupportedType,
			messageFileTooLarge: V.tooLarge,
		});
		if (err) {
			onValidationError(err);
			e.target.value = "";
			return;
		}
		void onUpload(file).finally(() => {
			if (fileInputRef.current) fileInputRef.current.value = "";
		});
	};

	const handleRemoveClick = () => {
		if (avatarBusy || !avatarUrl) return;
		void onRemove();
	};

	return (
		<div className="flex w-full shrink-0 flex-col items-center gap-6 p-8 lg:w-50">
			<div className="relative flex size-32 items-center justify-center overflow-hidden rounded-full bg-card">
				{avatarUrl ? (
					<Avatar className="size-32">
						<AvatarImage src={avatarUrl} alt="" />
						<AvatarFallback className="bg-card text-muted-foreground text-2xl">
							{initials}
						</AvatarFallback>
					</Avatar>
				) : (
					<UserRound className="size-14 text-muted-foreground" aria-hidden />
				)}
				{avatarBusy ? (
					<div
						className="absolute inset-0 flex items-center justify-center bg-background/70"
						role="status"
						aria-label={isUploading ? C.avatarUploading : C.avatarRemoving}
					>
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : null}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={V.fileAccept}
				className="sr-only"
				aria-label={C.avatarPickerAriaLabel}
				onChange={handleFileChange}
			/>

			<Button
				type="button"
				variant="outline"
				icon={Upload}
				disabled={avatarBusy}
				onClick={handleChooseFile}
				aria-label={C.changeAvatarButton}
				tabIndex={0}
			>
				{C.changeAvatarButton}
			</Button>

			{avatarUrl ? (
				<button
					type="button"
					className={cn(
						"inline-flex items-center gap-1.5 text-small font-semibold text-destructive cursor-pointer",
						avatarBusy && "pointer-events-none opacity-50",
					)}
					onClick={handleRemoveClick}
					disabled={avatarBusy}
					aria-label={C.removeAvatarButton}
					tabIndex={0}
				>
					<Trash2 className="size-3.5" aria-hidden />
					{C.removeAvatarButton}
				</button>
			) : null}
		</div>
	);
}
