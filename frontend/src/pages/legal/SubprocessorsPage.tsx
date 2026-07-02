import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BSPLogo } from "@/components";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { COPYRIGHT_BRAND, FOOTER_CONTENT, ROUTES } from "@/const";

const body = "text-regular font-normal leading-regular text-text-secondary";
const sectionTitle =
	"text-heading-4 font-semibold leading-heading-4 text-text-foreground";
const mailto =
	"font-semibold text-link underline underline-offset-4 hover:text-link-hover";

export function SubprocessorsPage() {
	const navigate = useNavigate();
	const year = new Date().getFullYear();

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0 });
	}, []);

	const handleBack = () => {
		if (window.history.length > 1) {
			navigate(-1);
			return;
		}
		navigate(ROUTES.auth.login);
	};

	const handleLegalPageNav = (path: string) => {
		navigate(path);
		window.scrollTo({ top: 0, left: 0 });
	};

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="border-b border-border px-4 py-5 sm:px-8">
				<div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
					<BSPLogo className="h-7 w-44 sm:w-56" />
					<Button
						type="button"
						variant="ghost"
						size="sm"
						icon={ArrowLeft}
						onClick={handleBack}
						className="shrink-0 text-text-secondary hover:text-text-foreground"
						aria-label="Back"
					>
						Back
					</Button>
				</div>
			</header>

			<main className="flex-1 px-4 py-8 sm:px-8">
				<article className="mx-auto w-full max-w-3xl space-y-8">
					<header className="space-y-2 border-b border-border pb-6">
						<h1 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
							Subprocessors
						</h1>
					</header>

					<section className="space-y-4">
						<h2 className={sectionTitle}>Overview</h2>
						<p className={body}>
							We use a limited number of trusted third-party service providers
							(“subprocessors”) to support the delivery, operation, and
							improvement of the BSP platform.
						</p>
						<p className={body}>
							These subprocessors may process personal data on our behalf,
							strictly in accordance with our instructions and applicable data
							protection laws.
						</p>
						<p className={body}>
							We carefully select our subprocessors and ensure appropriate
							safeguards are in place, including Data Processing Agreements
							(DPAs) where required.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>Current Subprocessors</h2>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Vendor</TableHead>
									<TableHead>Purpose</TableHead>
									<TableHead>Data Processed</TableHead>
									<TableHead>Location</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell className="whitespace-normal font-medium text-text-foreground">
										Stripe
									</TableCell>
									<TableCell className="whitespace-normal">
										Payment processing
									</TableCell>
									<TableCell className="whitespace-normal">
										Billing details, transaction data
									</TableCell>
									<TableCell className="whitespace-normal">
										USA / Global
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="whitespace-normal font-medium text-text-foreground">
										AWS (Amazon Web Services)
									</TableCell>
									<TableCell className="whitespace-normal">
										Hosting & infrastructure
									</TableCell>
									<TableCell className="whitespace-normal">
										Application data, user data
									</TableCell>
									<TableCell className="whitespace-normal">
										Region-specific
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="whitespace-normal font-medium text-text-foreground">
										Amazon SES
									</TableCell>
									<TableCell className="whitespace-normal">
										Email delivery
									</TableCell>
									<TableCell className="whitespace-normal">
										Email addresses, communication logs
									</TableCell>
									<TableCell className="whitespace-normal">USA</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="whitespace-normal font-medium text-text-foreground">
										PostHog
									</TableCell>
									<TableCell className="whitespace-normal">
										Product analytics & usage tracking
									</TableCell>
									<TableCell className="whitespace-normal">
										Usage data, events (configured to avoid sensitive data)
									</TableCell>
									<TableCell className="whitespace-normal">
										USA / EU (depending on setup)
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="whitespace-normal font-medium text-text-foreground">
										Amazon Cognito
									</TableCell>
									<TableCell className="whitespace-normal">
										Authentication & identity management
									</TableCell>
									<TableCell className="whitespace-normal">
										Email, login credentials (hashed), authentication data
									</TableCell>
									<TableCell className="whitespace-normal">
										USA / Global
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>How We Use Subprocessors</h2>
						<p className={body}>
							We use subprocessors only for specific purposes, including:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Hosting and infrastructure</li>
							<li>Payment processing</li>
							<li>Communication (emails, notifications)</li>
							<li>Product analytics and performance monitoring</li>
							<li>Authentication and account security</li>
						</ul>
						<p className={body}>
							Each subprocessor is authorized to process data only as necessary
							to provide these services.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>Data Protection & Safeguards</h2>
						<p className={body}>We ensure that all subprocessors:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>
								Enter into contractual agreements that include data protection
								obligations
							</li>
							<li>
								Implement appropriate technical and organizational security
								measures
							</li>
							<li>Process personal data only on documented instructions</li>
							<li>
								Support compliance with applicable regulations such as GDPR
							</li>
						</ul>
						<p className={body}>
							Where data is transferred internationally, we ensure appropriate
							safeguards are in place (e.g., Standard Contractual Clauses, where
							applicable).
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>Updates to This List</h2>
						<p className={body}>
							We may update this list from time to time as we add or change
							subprocessors.
						</p>
						<p className={body}>
							Where required, we will provide notice of material changes through
							our platform or via email.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>Contact Us</h2>
						<p className={body}>
							If you have any questions about our subprocessors or data handling
							practices, please contact us at:{" "}
							<a href="mailto:privacy@bspblueprint.com" className={mailto}>
								privacy@bspblueprint.com
							</a>
						</p>
					</section>
				</article>
			</main>

			<footer className="border-t border-border px-4 py-6 sm:px-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-2 text-center text-small text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
					<span className="font-normal">
						© {year} {COPYRIGHT_BRAND}
					</span>
					<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
						<button
							type="button"
							onClick={() => handleLegalPageNav(ROUTES.auth.privacyPolicy)}
							className="cursor-pointer font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
						>
							{FOOTER_CONTENT.privacyPolicy}
						</button>
						<span>{FOOTER_CONTENT.separator}</span>
						<button
							type="button"
							onClick={() => handleLegalPageNav(ROUTES.auth.termsOfUse)}
							className="cursor-pointer font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
						>
							{FOOTER_CONTENT.termsOfUse}
						</button>
					</div>
				</div>
			</footer>
		</div>
	);
}
