import { Link, useLocation, useNavigate } from "react-router-dom";
import { BehavioralNodes, BSPLogo, BSPSymbol } from "@/components";
import { Button } from "@/components/ui/button";
import {
	AUTH_LAYOUT_CONTENT,
	COPYRIGHT_BRAND,
	FOOTER_CONTENT,
	ROUTES,
} from "@/const";
import { cn } from "@/lib/utils";
import type { AuthLayoutProps } from "@/types";

export function AuthLayout({
	children,
	consentScreen = false,
}: AuthLayoutProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const year = new Date().getFullYear();
	const showContactSupport = location.pathname !== ROUTES.auth.support;

	const handleContactClick = () => {
		navigate(ROUTES.auth.support, { state: { from: location.pathname } });
	};

	return (
		<div className="relative min-h-screen w-full overflow-x-hidden bg-primary">
			<div className="dark absolute inset-0 z-0">
				<div
					className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950"
					aria-hidden
				/>
				<div className="absolute inset-0 hidden opacity-90 lg:block">
					<BehavioralNodes />
				</div>
			</div>

			<div className="pointer-events-none relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
				<div className="pointer-events-none hidden min-h-screen flex-1 flex-col justify-between gap-8 p-16 pr-8 lg:flex">
					<div>
						<div className="inline-flex rounded-xl bg-white/10 p-3">
							<BSPSymbol />
						</div>
					</div>

					<div className="max-w-96 space-y-6">
						<div className="space-y-3">
							<h1 className="animate-in fade-in-0 slide-in-from-left-3 duration-700 font-semibold leading-heading-1 tracking-tight text-heading-1 text-light-same">
								<span className="block">
									{AUTH_LAYOUT_CONTENT.leftHeadlineLine1}
								</span>
								<span className="block text-brand-secondary">
									{AUTH_LAYOUT_CONTENT.leftHeadlineAccent}
								</span>
								<span className="block">
									{AUTH_LAYOUT_CONTENT.leftHeadlineLine2}
								</span>
							</h1>
							<p className="animate-in fade-in-0 slide-in-from-left-2 delay-150 duration-700 max-w-sm font-medium leading-regular text-regular text-light-same opacity-50">
								{AUTH_LAYOUT_CONTENT.leftSubtitle}
							</p>
						</div>
					</div>

					<div className="h-4" aria-hidden />
				</div>

				<div className="pointer-events-none flex w-full shrink-0 flex-1 justify-center px-4 py-6 sm:px-6 lg:w-2xl lg:flex-none lg:items-stretch lg:justify-end lg:self-stretch lg:px-4 lg:py-4">
					<section
						className={cn(
							"pointer-events-auto flex w-full max-w-lg flex-1 flex-col bg-card",
							"rounded-2xl px-6 pb-6 sm:px-8",
							consentScreen ? "pt-8" : "pt-10",
							"lg:max-h-[min(calc(100vh-2rem),56rem)] lg:min-h-0 lg:flex-none lg:overflow-y-auto lg:rounded-3xl lg:pb-8",
							consentScreen ? "lg:px-7 lg:pt-7" : "lg:px-16 lg:pt-16",
						)}
					>
						<div
							className={cn(
								"flex shrink-0 justify-center",
								consentScreen ? "mb-5" : "mb-10 lg:mb-16",
							)}
						>
							<BSPLogo variant="auth" className="h-7 w-44 sm:w-56" />
						</div>

						<div className="flex flex-1 flex-col justify-center">
							{children}
						</div>

						{showContactSupport ? (
							<div
								className={cn(
									"flex w-full shrink-0 flex-wrap items-center justify-center gap-1 text-center",
									consentScreen ? "mt-7" : "mt-8",
								)}
							>
								<span className="text-small font-normal leading-small text-text-secondary">
									{AUTH_LAYOUT_CONTENT.helpText}
								</span>
								<Button
									type="button"
									variant="link"
									onClick={handleContactClick}
									className="h-auto min-h-8 cursor-pointer px-1.5 py-1.5 text-small font-semibold text-link underline hover:text-link-hover"
								>
									{AUTH_LAYOUT_CONTENT.contactUs}
								</Button>
							</div>
						) : null}

						<footer
							className={
								consentScreen
									? "mt-7 flex w-full shrink-0 justify-center text-center text-small text-muted-foreground"
									: "mt-8 flex w-full shrink-0 flex-col gap-2 text-center text-small text-muted-foreground sm:mt-12 sm:flex-row sm:items-start sm:justify-between sm:text-left"
							}
						>
							<span className="cursor-default font-normal">
								© {year} {COPYRIGHT_BRAND}
							</span>
							{consentScreen ? null : (
								<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
									<Link
										to={ROUTES.auth.privacyPolicy}
										className="font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
									>
										{FOOTER_CONTENT.privacyPolicy}
									</Link>
									<span className="text-muted-foreground">
										{FOOTER_CONTENT.separator}
									</span>
									<Link
										to={ROUTES.auth.termsOfUse}
										className="font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
									>
										{FOOTER_CONTENT.termsOfUse}
									</Link>
								</div>
							)}
						</footer>
					</section>
				</div>
			</div>
		</div>
	);
}
