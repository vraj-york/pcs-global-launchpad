import { yupResolver } from "@hookform/resolvers/yup";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { getRoleCategoriesWithRoles } from "@/api";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	FORM_PLACEHOLDERS,
	INVITE_USER_PAGE,
	SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES,
	SEND_INVITE_DIALOG_CONTENT,
} from "@/const";
import {
	type SendInviteContactDialogSchemaType,
	sendInviteContactDialogSchema,
} from "@/schemas";
import type {
	RoleCategoryWithRoles,
	SendInviteContactDialogProps,
} from "@/types";

export function SendInviteContactDialog({
	open,
	onOpenChange,
	isSubmitting = false,
	onSubmit,
}: SendInviteContactDialogProps) {
	const formId = "send-invite-contact-dialog-form";
	const [rolesTreeLoading, setRolesTreeLoading] = useState(false);
	const [rolesTreeError, setRolesTreeError] = useState<string | null>(null);
	const [categoriesWithRoles, setCategoriesWithRoles] = useState<
		RoleCategoryWithRoles[]
	>([]);

	const {
		control,
		handleSubmit,
		reset,
		watch,
		setValue,
		getValues,
		clearErrors,
		formState: { errors },
	} = useForm<SendInviteContactDialogSchemaType>({
		resolver: yupResolver(
			sendInviteContactDialogSchema,
		) as Resolver<SendInviteContactDialogSchemaType>,
		mode: "onTouched",
		reValidateMode: "onChange",
		defaultValues: {
			categoryId: "",
			roleId: "",
		},
	});

	const watchedCategoryId = watch("categoryId");

	const selectedCategory = useMemo(
		() => categoriesWithRoles.find((c) => c.id === watchedCategoryId),
		[categoriesWithRoles, watchedCategoryId],
	);
	const roleOptions = selectedCategory?.roles ?? [];

	useEffect(() => {
		if (!selectedCategory) return;
		const roles = selectedCategory.roles;
		const currentRoleId = getValues("roleId");
		const ok = roles.some((r) => r.id === currentRoleId);
		if (!ok) {
			setValue("roleId", roles[0]?.id ?? "", { shouldValidate: false });
			clearErrors("roleId");
		}
	}, [watchedCategoryId, selectedCategory, setValue, getValues, clearErrors]);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		reset({ categoryId: "", roleId: "" }, { keepErrors: false });
		setRolesTreeLoading(true);
		setRolesTreeError(null);
		getRoleCategoriesWithRoles().then((result) => {
			if (cancelled) return;
			setRolesTreeLoading(false);
			if (!result.ok) {
				setRolesTreeError(INVITE_USER_PAGE.rolesLoadError);
				toast.error(result.message);
				return;
			}
			const excluded = new Set<string>(
				SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES,
			);
			setCategoriesWithRoles(
				result.data.filter(
					(category) =>
						!excluded.has(category.name) && (category.roles?.length ?? 0) > 0,
				),
			);
		});
		return () => {
			cancelled = true;
		};
	}, [open, reset]);

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (!isOpen) {
				reset({ categoryId: "", roleId: "" }, { keepErrors: false });
				setRolesTreeError(null);
			}
			onOpenChange(isOpen);
		},
		[onOpenChange, reset],
	);

	const handleFormSubmit = useCallback(
		async (values: SendInviteContactDialogSchemaType) => {
			await onSubmit({
				categoryId: values.categoryId.trim(),
				roleId: values.roleId.trim(),
			});
		},
		[onSubmit],
	);

	const depsBlocked = rolesTreeLoading || !!rolesTreeError || isSubmitting;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-w-2xl gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-lg"
			>
				<form
					id={formId}
					onSubmit={handleSubmit(handleFormSubmit)}
					className="flex flex-col"
				>
					<div className="flex flex-row items-start justify-between gap-4 border-b border-border p-6">
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<DialogTitle>{SEND_INVITE_DIALOG_CONTENT.title}</DialogTitle>
							<DialogDescription className="text-small text-muted-foreground">
								{SEND_INVITE_DIALOG_CONTENT.description}
							</DialogDescription>
						</div>
						<DialogClose asChild>
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={isSubmitting}
								className="size-9 shrink-0 rounded-lg !border-none bg-card p-0 text-icon-secondary hover:bg-muted hover:text-text-foreground"
								aria-label="Close"
								tabIndex={0}
								icon={X}
							/>
						</DialogClose>
					</div>

					<div className="flex flex-col gap-6 px-6 py-6">
						{rolesTreeError && (
							<p className="text-small text-destructive">{rolesTreeError}</p>
						)}
						<FieldGroup className="gap-6">
							<Field data-invalid={!!errors.categoryId} className="!gap-1">
								<FieldLabel className="text-small font-medium text-text-foreground">
									<span className="text-destructive">*</span>
									{INVITE_USER_PAGE.fieldCategory}
								</FieldLabel>
								<Controller
									name="categoryId"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value || undefined}
											onValueChange={field.onChange}
											disabled={rolesTreeLoading || isSubmitting}
										>
											<SelectTrigger
												className="h-10 w-full"
												aria-invalid={!!errors.categoryId}
												aria-label={INVITE_USER_PAGE.fieldCategory}
											>
												<SelectValue
													placeholder={FORM_PLACEHOLDERS.selectCategory}
												/>
											</SelectTrigger>
											<SelectContent>
												{categoriesWithRoles.map((c) => (
													<SelectItem key={c.id} value={c.id}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FieldError>{errors.categoryId?.message}</FieldError>
							</Field>
							<Field data-invalid={!!errors.roleId} className="!gap-1">
								<FieldLabel className="text-small font-medium text-text-foreground">
									<span className="text-destructive">*</span>
									{INVITE_USER_PAGE.fieldRoleName}
								</FieldLabel>
								<Controller
									name="roleId"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value || undefined}
											onValueChange={field.onChange}
											disabled={
												rolesTreeLoading ||
												!!rolesTreeError ||
												isSubmitting ||
												!selectedCategory
											}
										>
											<SelectTrigger
												className="h-10 w-full"
												aria-invalid={!!errors.roleId}
												aria-label={INVITE_USER_PAGE.fieldRoleName}
											>
												<SelectValue
													placeholder={FORM_PLACEHOLDERS.selectRoleName}
												/>
											</SelectTrigger>
											<SelectContent>
												{roleOptions.map((r) => (
													<SelectItem key={r.id} value={r.id}>
														{r.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FieldError>{errors.roleId?.message}</FieldError>
							</Field>
						</FieldGroup>
					</div>

					<DialogFooter className="mt-0 gap-2 border-t border-border px-6 py-5 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting}
							tabIndex={0}
						>
							{SEND_INVITE_DIALOG_CONTENT.cancelButton}
						</Button>
						<Button
							type="submit"
							form={formId}
							disabled={depsBlocked}
							isLoading={isSubmitting}
							tabIndex={0}
						>
							{SEND_INVITE_DIALOG_CONTENT.sendInviteButton}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
