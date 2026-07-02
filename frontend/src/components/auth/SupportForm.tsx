import { yupResolver } from "@hookform/resolvers/yup";
import { CircleCheck, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitSupportRequest } from "@/api";
import { FormInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	AUTH_TEXT_INPUT_CLASSNAME,
	FORM_PLACEHOLDERS,
	SUPPORT_ATTACHMENT_ACCEPT,
	SUPPORT_MAX_ATTACHMENTS,
	SUPPORT_MESSAGE_MAX_LENGTH,
	SUPPORT_PAGE_CONTENT,
	SUPPORT_VALIDATION_MESSAGES,
} from "@/const";
import { cn } from "@/lib/utils";
import { type SupportRequestSchemaType, supportRequestSchema } from "@/schemas";
import type { SupportAttachmentPreview, SupportFormProps } from "@/types";
import { validateSupportAttachment } from "@/utils";

export function SupportForm({ readOnlyEmail, onSuccess }: SupportFormProps) {
	const content = SUPPORT_PAGE_CONTENT;
	const fileInputRef = useRef<HTMLInputElement>(null);
	const previewUrlsRef = useRef<string[]>([]);
	const [attachments, setAttachments] = useState<SupportAttachmentPreview[]>(
		[],
	);
	const [attachmentError, setAttachmentError] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const defaultEmail = readOnlyEmail?.trim() ?? "";

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting, isValid },
	} = useForm<SupportRequestSchemaType>({
		resolver: yupResolver(supportRequestSchema),
		mode: "onChange",
		defaultValues: {
			email: defaultEmail,
			subject: "",
			message: "",
		},
	});

	const existingFiles = useMemo(
		() => attachments.map((item) => item.file),
		[attachments],
	);

	useEffect(() => {
		return () => {
			for (const previewUrl of previewUrlsRef.current) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, []);

	const handleAddAttachments = useCallback(
		(fileList: FileList | null) => {
			if (!fileList?.length) return;

			setAttachmentError(null);
			const nextAttachments = [...attachments];

			for (const file of Array.from(fileList)) {
				if (nextAttachments.length >= SUPPORT_MAX_ATTACHMENTS) {
					setAttachmentError(SUPPORT_VALIDATION_MESSAGES.maxAttachments);
					break;
				}

				const validationError = validateSupportAttachment(
					file,
					nextAttachments.map((item) => item.file),
				);
				if (validationError) {
					setAttachmentError(validationError);
					continue;
				}

				nextAttachments.push({
					id: `${file.name}-${file.size}-${file.lastModified}`,
					file,
					previewUrl: URL.createObjectURL(file),
				});
				previewUrlsRef.current.push(
					nextAttachments[nextAttachments.length - 1].previewUrl,
				);
			}

			setAttachments(nextAttachments);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[attachments],
	);

	const handleRemoveAttachment = useCallback((id: string) => {
		setAttachments((current) => {
			const target = current.find((item) => item.id === id);
			if (target) {
				URL.revokeObjectURL(target.previewUrl);
				previewUrlsRef.current = previewUrlsRef.current.filter(
					(url) => url !== target.previewUrl,
				);
			}
			return current.filter((item) => item.id !== id);
		});
		setAttachmentError(null);
	}, []);

	const handleUploadClick = () => {
		if (attachments.length >= SUPPORT_MAX_ATTACHMENTS || isSubmitting) return;
		fileInputRef.current?.click();
	};

	const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		handleAddAttachments(event.dataTransfer.files);
	};

	const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	};

	const handleFormSubmit = async (values: SupportRequestSchemaType) => {
		setAttachmentError(null);

		const result = await submitSupportRequest({
			email: values.email.trim(),
			subject: values.subject.trim(),
			message: values.message?.trim() ?? "",
			attachments: existingFiles,
		});

		if (!result.ok) {
			toast.error(result.message || content.submitError);
			return;
		}

		setIsSubmitted(true);
	};

	const canAddMoreAttachments = attachments.length < SUPPORT_MAX_ATTACHMENTS;
	const successActionLabel = readOnlyEmail
		? content.continueButton
		: content.loginAgainButton;

	if (isSubmitted) {
		return (
			<div className="flex w-full flex-col items-center gap-10">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-success p-2"
					aria-hidden
				>
					<CircleCheck className="size-12 text-light-same" strokeWidth={2} />
				</div>
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-3 font-semibold leading-heading-3 tracking-heading-2 text-text-foreground">
						{content.successTitle}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular text-text-secondary">
						{content.successDescription}
					</CardDescription>
				</div>
				<Button
					type="button"
					onClick={onSuccess}
					size="lg"
					className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same"
				>
					{successActionLabel}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-8">
			<h1 className="text-center text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
				{content.title}
			</h1>

			<form
				onSubmit={handleSubmit(handleFormSubmit)}
				className="flex w-full flex-col gap-8"
			>
				<div className="flex flex-col gap-6">
					<FormInput
						id="support-email"
						label={content.emailLabel}
						type="email"
						placeholder={FORM_PLACEHOLDERS.enterEmail}
						autoComplete="email"
						required
						readOnly={Boolean(readOnlyEmail)}
						disabled={Boolean(readOnlyEmail) || isSubmitting}
						className={AUTH_TEXT_INPUT_CLASSNAME}
						error={errors.email?.message}
						{...register("email")}
					/>

					<FormInput
						id="support-subject"
						label={content.subjectLabel}
						type="text"
						placeholder={FORM_PLACEHOLDERS.enterSubject}
						required
						disabled={isSubmitting}
						className={AUTH_TEXT_INPUT_CLASSNAME}
						error={errors.subject?.message}
						{...register("subject")}
					/>

					<div className="space-y-2">
						<Label
							htmlFor="support-message"
							className="text-small font-medium text-text-foreground"
						>
							{content.messageLabel}
						</Label>
						<Textarea
							id="support-message"
							placeholder={FORM_PLACEHOLDERS.typeMessage}
							disabled={isSubmitting}
							maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
							className={cn(
								AUTH_TEXT_INPUT_CLASSNAME,
								"min-h-20 resize-none px-4 py-2",
								errors.message ? "border-destructive" : "",
							)}
							aria-invalid={!!errors.message}
							{...register("message")}
						/>
						{errors.message ? (
							<p className="text-mini text-destructive">
								{errors.message.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept={SUPPORT_ATTACHMENT_ACCEPT}
							multiple
							className="hidden"
							aria-label={content.attachmentsAriaLabel}
							onChange={(event) => handleAddAttachments(event.target.files)}
						/>

						<Button
							type="button"
							variant="ghost"
							disabled={!canAddMoreAttachments || isSubmitting}
							onClick={handleUploadClick}
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							className={cn(
								"h-auto w-full cursor-pointer rounded-lg border border-dashed border-input bg-background p-2 shadow-none hover:bg-background",
								!canAddMoreAttachments && "cursor-not-allowed opacity-60",
							)}
							tabIndex={0}
							aria-label={content.attachmentsAriaLabel}
						>
							<div className="flex w-full items-center gap-4">
								<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-card">
									<Paperclip
										className="size-4 text-icon-secondary"
										aria-hidden
									/>
								</div>
								<div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
									<span className="text-small font-semibold text-text-foreground">
										{content.attachmentsTitle}
									</span>
									<span className="text-mini font-normal text-muted-foreground">
										{content.attachmentsHint}
									</span>
								</div>
							</div>
						</Button>

						{attachmentError ? (
							<p className="text-mini text-destructive" role="alert">
								{attachmentError}
							</p>
						) : null}

						{attachments.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{attachments.map((attachment) => (
									<div
										key={attachment.id}
										className="group relative size-20 rounded-lg border border-border bg-background p-1"
									>
										<img
											src={attachment.previewUrl}
											alt=""
											className="size-full rounded-md object-cover"
										/>
										{!isSubmitting ? (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												icon={Trash2}
												onClick={() => handleRemoveAttachment(attachment.id)}
												className="absolute inset-1 size-auto rounded-md bg-black/70 p-0 text-light-same opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/70 hover:text-light-same"
												aria-label={content.removeAttachmentAriaLabel}
												tabIndex={0}
											/>
										) : null}
									</div>
								))}
							</div>
						) : null}
					</div>
				</div>

				<Button
					type="submit"
					size="lg"
					disabled={!isValid}
					isLoading={isSubmitting}
					className="h-10 w-full rounded-lg text-small font-semibold text-light-same"
				>
					{isSubmitting ? content.submitting : content.submitButton}
				</Button>
			</form>
		</div>
	);
}
