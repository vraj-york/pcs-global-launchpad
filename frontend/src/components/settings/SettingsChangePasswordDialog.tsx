import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
	ContentModal,
	FormInput,
	PasswordStrengthIndicator,
} from "@/components";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
	AUTH_TEXT_INPUT_CLASSNAME,
	FORM_PLACEHOLDERS,
	PASSWORD_VISIBILITY_LABELS,
	SETTINGS_PAGE_CONTENT,
	SETTINGS_SECURITY_CONTENT,
} from "@/const";
import {
	type SettingsChangePasswordSchemaType,
	settingsChangePasswordSchema,
} from "@/schemas";
import { useAccountSecurityStore } from "@/store";
import type { SettingsChangePasswordDialogProps } from "@/types";
import { calculatePasswordStrength } from "@/utils";

const C = SETTINGS_SECURITY_CONTENT;
const PAGE = SETTINGS_PAGE_CONTENT;

export function SettingsChangePasswordDialog({
	open,
	onOpenChange,
}: SettingsChangePasswordDialogProps) {
	const { changePassword, isChangePasswordSubmitting } =
		useAccountSecurityStore();

	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const {
		register,
		handleSubmit,
		watch,
		trigger,
		reset,
		formState: { errors },
	} = useForm<SettingsChangePasswordSchemaType>({
		resolver: yupResolver(settingsChangePasswordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		mode: "onChange",
	});

	const newPassword = watch("newPassword");
	const confirmPassword = watch("confirmPassword");

	useEffect(() => {
		if (!open) {
			reset();
			setShowCurrentPassword(false);
			setShowNewPassword(false);
			setShowConfirmPassword(false);
		}
	}, [open, reset]);

	useEffect(() => {
		if (confirmPassword) {
			void trigger("confirmPassword");
		}
	}, [newPassword, confirmPassword, trigger]);

	const isStrong = calculatePasswordStrength(newPassword) === "strong";
	const hasNoErrors =
		!errors.currentPassword && !errors.newPassword && !errors.confirmPassword;
	const isFormValid =
		isStrong && hasNoErrors && confirmPassword !== "" && newPassword !== "";

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && isChangePasswordSubmitting) {
			return;
		}
		onOpenChange(nextOpen);
	};

	const onSubmit = async (values: SettingsChangePasswordSchemaType) => {
		const success = await changePassword({
			currentPassword: values.currentPassword,
			newPassword: values.newPassword,
			confirmPassword: values.confirmPassword,
		});
		if (success) {
			handleOpenChange(false);
		}
	};

	const passwordToggleButton = (
		show: boolean,
		onToggle: () => void,
		ariaLabel: string,
	) => (
		<Button
			type="button"
			variant="ghost"
			onClick={onToggle}
			className="absolute top-1/2 right-3 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
			aria-label={ariaLabel}
			tabIndex={0}
		>
			{show ? (
				<EyeOff className="size-4 text-icon-secondary" aria-hidden />
			) : (
				<Eye className="size-4 text-icon-secondary" aria-hidden />
			)}
		</Button>
	);

	return (
		<ContentModal
			open={open}
			onOpenChange={handleOpenChange}
			contentClassName="flex max-w-xl flex-col gap-0 p-0"
			title={C.changePasswordDialogTitle}
			description={C.changePasswordDialogSubtitle}
		>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex flex-col gap-6 p-6"
			>
				<Banner
					title={C.passwordRuleTitle}
					titleClassName="text-info-text"
					childrenClassName="text-text-foreground"
					icon={<Lock className="size-4 shrink-0 text-icon-info" aria-hidden />}
				>
					{C.passwordRuleBodyPrefix}
					<span className="font-semibold">{C.passwordRuleMinLength}</span>
					{C.passwordRuleMiddle}
					<span className="font-semibold">{C.passwordRuleCase}</span>
					{C.passwordRuleMiddle2}
					<span className="font-semibold">{C.passwordRuleSymbolOrNumber}</span>
					{C.passwordRuleSuffix}
				</Banner>

				<FormInput
					id="settings-current-password"
					label={C.fieldCurrentPassword}
					required
					type={showCurrentPassword ? "text" : "password"}
					placeholder={FORM_PLACEHOLDERS.enterPassword}
					autoComplete="current-password"
					className={AUTH_TEXT_INPUT_CLASSNAME}
					error={errors.currentPassword?.message}
					{...register("currentPassword")}
					rightElement={passwordToggleButton(
						showCurrentPassword,
						() => setShowCurrentPassword((prev) => !prev),
						showCurrentPassword
							? PASSWORD_VISIBILITY_LABELS.hide
							: PASSWORD_VISIBILITY_LABELS.show,
					)}
				/>

				<div className="flex flex-col gap-2">
					<FormInput
						id="settings-new-password"
						label={C.fieldNewPassword}
						required
						type={showNewPassword ? "text" : "password"}
						placeholder={FORM_PLACEHOLDERS.newPassword}
						autoComplete="new-password"
						className={AUTH_TEXT_INPUT_CLASSNAME}
						error={errors.newPassword?.message}
						{...register("newPassword")}
						rightElement={passwordToggleButton(
							showNewPassword,
							() => setShowNewPassword((prev) => !prev),
							showNewPassword
								? PASSWORD_VISIBILITY_LABELS.hide
								: PASSWORD_VISIBILITY_LABELS.show,
						)}
					/>

					<PasswordStrengthIndicator password={newPassword} />
				</div>

				<FormInput
					id="settings-confirm-password"
					label={C.fieldConfirmPassword}
					required
					type={showConfirmPassword ? "text" : "password"}
					placeholder={FORM_PLACEHOLDERS.confirmPassword}
					autoComplete="new-password"
					className={AUTH_TEXT_INPUT_CLASSNAME}
					error={errors.confirmPassword?.message}
					{...register("confirmPassword")}
					rightElement={passwordToggleButton(
						showConfirmPassword,
						() => setShowConfirmPassword((prev) => !prev),
						showConfirmPassword
							? PASSWORD_VISIBILITY_LABELS.hide
							: PASSWORD_VISIBILITY_LABELS.show,
					)}
				/>

				<DialogFooter className="mt-0 flex-row justify-end gap-2 border-t border-border px-0 pt-5 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={isChangePasswordSubmitting}
						onClick={() => handleOpenChange(false)}
					>
						{C.cancelButton}
					</Button>
					<Button
						type="submit"
						disabled={!isFormValid}
						isLoading={isChangePasswordSubmitting}
					>
						{isChangePasswordSubmitting ? C.savingButton : PAGE.saveButton}
					</Button>
				</DialogFooter>
			</form>
		</ContentModal>
	);
}
