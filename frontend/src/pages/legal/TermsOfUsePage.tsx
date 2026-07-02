import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BSPLogo } from "@/components";
import { Button } from "@/components/ui/button";
import { COPYRIGHT_BRAND, FOOTER_CONTENT, ROUTES } from "@/const";

const body = "text-regular font-normal leading-regular text-text-secondary";
const sectionTitle =
	"text-heading-4 font-semibold leading-heading-4 text-text-foreground";
const mailto =
	"font-semibold text-link underline underline-offset-4 hover:text-link-hover";

export function TermsOfUsePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const year = new Date().getFullYear();
	const showPrivacyLink = location.pathname !== ROUTES.auth.privacyPolicy;

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

	const handlePrivacyNav = () => {
		navigate(ROUTES.auth.privacyPolicy);
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
							TERMS OF USE
						</h1>
						<p className="text-small font-normal leading-small text-muted-foreground">
							Effective Date: January 1st, 2026
						</p>
					</header>

					<section className="space-y-4">
						<h2 className={sectionTitle}>1. Acceptance of Terms</h2>
						<p className={body}>
							By accessing or using BSPBlueprint (“Platform”), you agree to
							these Terms of Use.
						</p>
						<p className={body}>
							If you do not agree, do not use the Platform.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>2. Description of Service</h2>
						<p className={body}>BSPBlueprint provides:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Behavioral assessments</li>
							<li>Coaching insights</li>
							<li>Organizational and team development tools</li>
						</ul>
						<p className={body}>
							These are provided for informational and professional development
							purposes only.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>3. User Accounts</h2>
						<p className={body}>You agree to:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Provide accurate information</li>
							<li>Maintain confidentiality of login credentials</li>
							<li>Be responsible for all activity under your account</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>4. Acceptable Use</h2>
						<p className={body}>You may not:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Use the platform for unlawful purposes</li>
							<li>Reverse engineer or attempt to extract source code</li>
							<li>Interfere with platform functionality</li>
							<li>Misuse or resell the service without authorization</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>5. Intellectual Property</h2>
						<p className={body}>All content, including:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Assessment frameworks</li>
							<li>Algorithms</li>
							<li>Reports</li>
							<li>Branding</li>
						</ul>
						<p className={body}>
							…is the property of BSPBlueprint and protected by law. You may not
							copy, reproduce, or distribute without permission.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>6. Data & Insights Disclaimer</h2>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>
								Assessment results are interpretive tools, not definitive
								psychological diagnoses
							</li>
							<li>
								BSPBlueprint does not provide medical, psychological, or legal
								advice
							</li>
							<li>Users are responsible for how they apply insights</li>
						</ul>
						<p className={body}>
							Certain insights and responses provided by the Platform are
							generated using artificial intelligence (AI), incorporating
							user-provided data, behavioral assessments (including BSP), team
							data, and other contextual inputs. AI-generated outputs may not be
							complete or fully accurate and are provided for informational and
							developmental purposes only. BSPBlueprint makes no guarantees
							regarding the accuracy or applicability of such outputs, and users
							are responsible for their interpretation and use.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>7. Organization Accounts</h2>
						<p className={body}>
							If you access via an employer or organization:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Your data may be visible to authorized administrators</li>
							<li>The organization may control your access</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							7A. Individual Assessment Data Rights
						</h2>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>
								Users retain ownership of their individual BSP assessment
								results, coaching history, and personal development records
								generated through the Platform. Participation through an
								employer-sponsored or organization-sponsored account does not
								transfer ownership of such individual records to the sponsoring
								organization.
							</li>
							<li>
								Subject to applicable law, security requirements, and Company
								policies, users may request access to or export of their
								individual assessment and coaching data. Additional details
								regarding data ownership, retention, and portability are
								provided in the BSPBlueprint Privacy Policy.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>8. Subscription & Payments</h2>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Some features require paid subscriptions</li>
							<li>
								Fees are billed as agreed and are non-refundable unless stated
								otherwise
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>9. Termination</h2>
						<p className={body}>We may suspend or terminate access if:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Terms are violated</li>
							<li>Misuse or abuse is detected</li>
						</ul>
						<p className={body}>
							Users may terminate their account at any time.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>10. Limitation of Liability</h2>
						<p className={body}>
							To the fullest extent permitted by law, BSPBlueprint is not liable
							for:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Indirect or consequential damages</li>
							<li>Loss of data, profits, or business outcomes</li>
							<li>Decisions made based on platform insights</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>11. Indemnification</h2>
						<p className={body}>
							You agree to indemnify BSPBlueprint against claims arising from:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Your use of the Platform</li>
							<li>Violation of these Terms</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>12. Governing Law</h2>
						<p className={body}>
							These Terms are governed by the laws of the State of Michigan.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>13. Changes to Terms</h2>
						<p className={body}>
							We may update these Terms at any time. Continued use constitutes
							acceptance.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>14. Contact</h2>
						<p className={body}>BSPBlueprint</p>
						<p className={body}>
							Email:{" "}
							<a href="mailto:legal@bspblueprint.com" className={mailto}>
								legal@bspblueprint.com
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
					{showPrivacyLink ? (
						<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
							<button
								type="button"
								onClick={handlePrivacyNav}
								className="cursor-pointer font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
							>
								{FOOTER_CONTENT.privacyPolicy}
							</button>
						</div>
					) : null}
				</div>
			</footer>
		</div>
	);
}
