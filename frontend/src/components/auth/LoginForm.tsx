import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { FormInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	AUTH_FIELD_NAMES,
	AUTH_FORM_IDS,
	AUTH_TEXT_INPUT_CLASSNAME,
	FORM_PLACEHOLDERS,
	LOGIN_PAGE_CONTENT,
	LOGIN_PAGE_SUBTITLE_LINES,
	LOGIN_PAGE_SUBTITLE_ROTATION_MS,
	PASSWORD_VISIBILITY_LABELS,
	ROUTES,
} from "@/const";
import { DEMO_LOGIN_HINT, isDemoMode } from "@/demo";
import { resolvePostLoginNavigationTarget } from "@/lib";
import { type LoginSchemaType, loginSchema } from "@/schemas";
import { useAuthStore } from "@/store";
import type { LoginFormProps, PostLoginRedirectLocationState } from "@/types";

export function LoginForm({ setTempPassword }: LoginFormProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { login, isLoading, error: loginError, clearError } = useAuthStore();
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [subtitleIndex, setSubtitleIndex] = useState(0);

	useEffect(() => {
		const id = window.setInterval(() => {
			setSubtitleIndex((i) => (i + 1) % LOGIN_PAGE_SUBTITLE_LINES.length);
		}, LOGIN_PAGE_SUBTITLE_ROTATION_MS);
		return () => window.clearInterval(id);
	}, []);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isValid },
	} = useForm<LoginSchemaType>({
		resolver: yupResolver(loginSchema),
		mode: "onChange",
	});

	const watchedEmail = watch(AUTH_FIELD_NAMES.email);
	const watchedPassword = watch(AUTH_FIELD_NAMES.password);

	useEffect(() => {
		clearError();
	}, [watchedEmail, watchedPassword, clearError]);

	const onSubmit = async (data: LoginSchemaType) => {
		setTempPassword(data.password);

		const result = await login({
			email: data.email.trim().toLowerCase(),
			password: data.password,
			rememberMe,
		});

		if (result === "success") {
			const state = location.state as PostLoginRedirectLocationState | null;
			try {
				const target = await resolvePostLoginNavigationTarget({
					locationStateFrom: state?.from,
					search: location.search,
				});
				navigate(target, { replace: true });
			} finally {
				useAuthStore.setState({ isLoading: false });
			}
		}
	};

	const handleForgotPassword = () => {
		navigate(ROUTES.auth.forgotPassword);
	};

	const passwordAriaLabel = showPassword
		? PASSWORD_VISIBILITY_LABELS.hide
		: PASSWORD_VISIBILITY_LABELS.show;

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col gap-16">
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{LOGIN_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription
						className="w-full text-regular text-muted-foreground"
						aria-live="polite"
					>
						<span className="flex w-full items-center justify-center">
							<span
								key={subtitleIndex}
								className="text-balance animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
							>
								{LOGIN_PAGE_SUBTITLE_LINES[subtitleIndex]}
							</span>
						</span>
					</CardDescription>
				</div>

				<form
					id={AUTH_FORM_IDS.loginForm}
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-8"
				>
					<div className="flex flex-col gap-6">
						<FormInput
							id={AUTH_FORM_IDS.email}
							label={LOGIN_PAGE_CONTENT.emailLabel}
							type="email"
							placeholder={FORM_PLACEHOLDERS.enterEmail}
							autoComplete="email"
							className={AUTH_TEXT_INPUT_CLASSNAME}
							error={errors.email?.message}
							{...register(AUTH_FIELD_NAMES.email)}
						/>

						<FormInput
							id={AUTH_FORM_IDS.password}
							label={LOGIN_PAGE_CONTENT.passwordLabel}
							type={showPassword ? "text" : "password"}
							placeholder={FORM_PLACEHOLDERS.enterPassword}
							autoComplete="current-password"
							className={AUTH_TEXT_INPUT_CLASSNAME}
							error={errors.password?.message}
							{...register(AUTH_FIELD_NAMES.password)}
							rightElement={
								<Button
									type="button"
									variant="ghost"
									onClick={() => setShowPassword((prev) => !prev)}
									className="absolute right-3 top-1/2 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
									aria-label={passwordAriaLabel}
								>
									{showPassword ? (
										<EyeOff className="size-4 text-icon-secondary" />
									) : (
										<Eye className="size-4 text-icon-secondary" />
									)}
								</Button>
							}
						/>

						<div className="flex min-h-6 items-center justify-between gap-2">
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<Switch
									checked={rememberMe}
									onCheckedChange={setRememberMe}
									aria-label={LOGIN_PAGE_CONTENT.rememberMe}
								/>
								<span className="text-small font-normal leading-small text-text-foreground">
									{LOGIN_PAGE_CONTENT.rememberMe}
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								onClick={handleForgotPassword}
								className="h-auto shrink-0 cursor-pointer px-1.5 py-1.5 text-small font-medium text-link no-underline hover:bg-transparent hover:text-link-hover hover:no-underline"
							>
								{LOGIN_PAGE_CONTENT.forgotPassword}
							</Button>
						</div>
					</div>

					<div className="flex flex-col gap-2.5">
						{isDemoMode ? (
							<p className="text-center text-small text-muted-foreground">
								{DEMO_LOGIN_HINT}
							</p>
						) : null}
						{loginError ? (
							<div className="flex w-full items-center justify-center">
								<p className="text-center text-small font-medium text-brand-red">
									{loginError}
								</p>
							</div>
						) : null}

						<Button
							type="submit"
							disabled={!isValid}
							isLoading={isLoading}
							size="lg"
							className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same"
						>
							{isLoading ? "Logging in..." : LOGIN_PAGE_CONTENT.submitButton}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
