import { Loader2, Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type ValidateFileOptions, validateFile } from "@/utils/sharedUtils";

export type FileUploadAreaProps = {
	/** Called with the selected file after validation passes. */
	onUpload: (file: File) => Promise<void>;
	/** Validation options (max size, allowed MIME types, error messages). */
	validationOptions: ValidateFileOptions;
	/** Primary label inside the upload zone (e.g. "Click to upload or drag-&-drop file"). */
	uploadLabel: string;
	/** Hint text below the label (e.g. "Supported file formats are PNG & JPG up to 10MB"). */
	uploadHint: string;
	/** HTML accept attribute for the file input (e.g. ".png,.jpg,.jpeg,.svg"). */
	accept?: string;
	/** When true, shows loading state and disables the zone. */
	isUploading?: boolean;
	/** Called when file validation fails (caller can set error state and display message). */
	onValidationError?: (error: string | null) => void;
	/** Optional aria-label for the hidden file input. */
	ariaLabel?: string;
	/** Optional class name for the root wrapper. */
	className?: string;
};

export function FileUploadArea({
	onUpload,
	validationOptions,
	uploadLabel,
	uploadHint,
	accept,
	isUploading = false,
	onValidationError,
	ariaLabel,
	className,
}: FileUploadAreaProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = (file: File) => {
		onValidationError?.(null);
		const err = validateFile(file, validationOptions);
		if (err) {
			onValidationError?.(err);
			return;
		}
		void onUpload(file).finally(() => {
			if (fileInputRef.current) fileInputRef.current.value = "";
		});
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (!file) return;
		handleFile(file);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
	};

	return (
		<Card
			className={cn(
				"w-full border border-solid border-border bg-white transition-colors",
				isUploading && "pointer-events-none opacity-70",
				className,
			)}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept={accept}
				className="hidden"
				aria-label={ariaLabel ?? uploadLabel}
				onChange={handleInputChange}
			/>
			<Button
				type="button"
				variant="ghost"
				disabled={isUploading}
				onClick={() => fileInputRef.current?.click()}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				className="flex h-auto w-full flex-col gap-2 rounded-xl border-0 bg-transparent px-6 py-10 shadow-none hover:bg-transparent hover:text-text-foreground"
			>
				{isUploading ? (
					<Loader2
						className="size-10 shrink-0 animate-spin text-primary"
						aria-hidden
					/>
				) : (
					<div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
						<Upload className="size-5 text-primary" aria-hidden />
					</div>
				)}
				<span className="text-sm font-semibold text-text-foreground">
					{uploadLabel}
				</span>
				<CardDescription className="text-center !font-normal">
					{uploadHint}
				</CardDescription>
			</Button>
		</Card>
	);
}
