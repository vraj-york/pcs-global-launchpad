import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BSPLogo } from "@/components";
import { Button } from "@/components/ui/button";
import { COPYRIGHT_BRAND, FOOTER_CONTENT, ROUTES } from "@/const";

const body = "text-regular font-normal leading-regular text-text-secondary";
const sectionTitle =
	"text-heading-4 font-semibold leading-heading-4 text-text-foreground";
const mailto =
	"font-semibold text-link underline underline-offset-4 hover:text-link-hover";

export function PrivacyPolicyPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const year = new Date().getFullYear();
	const showTermsLink = location.pathname !== ROUTES.auth.termsOfUse;

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

	const handleTermsNav = () => {
		navigate(ROUTES.auth.termsOfUse);
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
							PRIVACY POLICY
						</h1>
						<p className="text-small font-normal leading-small text-muted-foreground">
							Effective Date: January 1st, 2026
						</p>
					</header>

					<section className="space-y-4">
						<h2 className={sectionTitle}>1. Overview</h2>
						<p className={body}>
							BSPBlueprint (“Company,” “we,” “our,” or “us”) respects your
							privacy and is committed to protecting the personal information of
							our users.
						</p>
						<p className={body}>
							This Privacy Policy explains how we collect, use, disclose, and
							safeguard your information when you access our platform at
							bspblueprint.com (the “Platform”).
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>2. Information We Collect</h2>
						<h3 className="text-regular font-semibold leading-regular text-text-foreground">
							Information You Provide
						</h3>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Name, email address, and login credentials</li>
							<li>Profile and assessment responses</li>
							<li>Organization/company affiliation</li>
							<li>Communications with us (support, feedback, etc.)</li>
						</ul>
						<h3 className="text-regular font-semibold leading-regular text-text-foreground">
							Automatically Collected Information
						</h3>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>IP address</li>
							<li>Browser type and device information</li>
							<li>
								Usage data (pages visited, features used, session duration)
							</li>
						</ul>
						<h3 className="text-regular font-semibold leading-regular text-text-foreground">
							Assessment & Behavioral Data
						</h3>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Responses to behavioral assessments</li>
							<li>Derived insights, scores, and reports</li>
						</ul>
						<p className={body}>
							Note: This data may be sensitive in nature and is handled with
							heightened care.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>3. How We Use Your Information</h2>
						<p className={body}>We use your information to:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Provide and operate the Platform</li>
							<li>Deliver assessments and generate insights</li>
							<li>Improve product functionality and user experience</li>
							<li>Communicate with you (support, updates, onboarding)</li>
							<li>Ensure security and prevent fraud</li>
							<li>
								We may use artificial intelligence (AI) technologies to analyze
								user data and generate personalized insights, recommendations,
								and coaching responses.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>4. How We Share Information</h2>
						<p className={body}>We do not sell your personal data.</p>
						<p className={body}>We may share data with:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Service providers (hosting, analytics, infrastructure)</li>
							<li>Your organization/employer (if using a company account)</li>
							<li>Legal authorities if required by law</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>5. Data Ownership & Control</h2>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Individuals retain rights to their personal data</li>
							<li>
								Organizations may have access to employee-level reporting
								depending on plan
							</li>
							<li>
								Users may request access, correction, or deletion of their data
							</li>
							<li>
								Contact:{" "}
								<a href="mailto:privacy@bspblueprint.com" className={mailto}>
									privacy@bspblueprint.com
								</a>
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							6. Data Security & Protection of Personal Information
						</h2>
						<p className={body}>
							BSPBlueprint takes the protection of your personally identifiable
							information (PII) seriously and implements industry-standard
							safeguards, including:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Encryption of data in transit and at rest</li>
							<li>Secure cloud infrastructure and access controls</li>
							<li>Role-based permissions and authentication protocols</li>
							<li>Ongoing monitoring and security best practices</li>
						</ul>
						<p className={body}>
							We are committed to protecting sensitive behavioral and assessment
							data with a high level of care appropriate to its nature.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>7. Data Retention</h2>
						<p className={body}>We retain data:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>As long as your account is active</li>
							<li>As necessary to provide services</li>
							<li>As required for legal or compliance purposes</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>8. Cookies & Tracking</h2>
						<p className={body}>We use cookies and similar technologies to:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Maintain sessions</li>
							<li>Analyze usage</li>
							<li>Improve performance</li>
						</ul>
						<p className={body}>
							You can control cookies via browser settings.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>9. Third-Party Services</h2>
						<p className={body}>
							We may use third-party providers (e.g., analytics, payment
							processors). These providers have their own privacy policies.
						</p>
						<p className={body}>
							For a list of our current subprocessors, see our{" "}
							<Link
								to={ROUTES.auth.subprocessors}
								target="_blank"
								rel="noopener noreferrer"
								className={mailto}
							>
								Subprocessors
							</Link>{" "}
							page.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>10. Your Rights</h2>
						<p className={body}>
							Depending on your location, you may have rights to:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Access your data</li>
							<li>Correct inaccuracies</li>
							<li>Request deletion</li>
							<li>Restrict or object to processing</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>11. Children’s Privacy</h2>
						<p className={body}>
							The Platform is not intended for individuals under 18.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>12. Changes to This Policy</h2>
						<p className={body}>
							We may update this Privacy Policy periodically. Updates will be
							posted with a revised “Effective Date.”
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							14. Data Ownership & Use of Aggregated Data
						</h2>
						<h3 className="text-regular font-semibold leading-regular text-text-foreground">
							Data Ownership & Aggregated Use
						</h3>
						<p className={body}>
							BSPBlueprint recognizes that your personal and assessment data is
							yours.
						</p>
						<p className={body}>
							Individual Ownership: You retain ownership of your personal data
							and individual assessment results.
						</p>
						<p className={body}>
							Organizational Context: If you are using BSPBlueprint through an
							employer or organization, that organization may have access to
							certain reporting and insights as defined by its agreement with
							BSPBlueprint.
						</p>
						<p className={body}>
							Aggregated & Anonymized Use: We may use data in a fully anonymized
							and aggregated form to:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Improve our platform and algorithms</li>
							<li>Develop benchmarking insights</li>
							<li>Enhance reporting and product features</li>
						</ul>
						<p className={body}>
							This data cannot be used to identify you personally and is
							stripped of all personally identifiable information (PII).
						</p>
						<p className={body}>
							BSPBlueprint does not sell or share identifiable personal data
							with third parties for marketing purposes.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							15. Health Information & HIPAA Considerations
						</h2>
						<p className={body}>
							BSPBlueprint is designed to support personal and professional
							development and is not a healthcare provider.
						</p>
						<p className={body}>
							While BSPBlueprint does not typically collect or store protected
							health information (PHI) as defined under the Health Insurance
							Portability and Accountability Act (HIPAA), we apply HIPAA-aligned
							security and data protection practices where applicable to
							safeguard sensitive user information.
						</p>
						<p className={body}>
							Users should not submit medical or clinical health records through
							the Platform unless explicitly authorized under a separate
							agreement.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							16. Data Ownership and Platform Use
						</h2>
						<p className={body}>
							Users retain ownership of their personal data and individual
							assessment results submitted through the Platform.
						</p>
						<p className={body}>
							By using BSPBlueprint, you grant the Company the right to use data
							in a de-identified, anonymized, and aggregated form for purposes
							including:
						</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>Product improvement</li>
							<li>Research and development</li>
							<li>Benchmarking and analytics</li>
						</ul>
						<p className={body}>Such use will never identify you personally.</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>
							17. User Ownership, Portability, and Continuity of Assessment Data
						</h2>
						<p className={body}>
							BSPBlueprint believes that an individual&apos;s behavioral
							assessment history, coaching interactions, and personal
							development records belong to that individual.
						</p>
						<p className={body}>Accordingly:</p>
						<ul className={`list-disc space-y-2 pl-5 ${body}`}>
							<li>
								Users retain ownership of their individual BSP assessment
								results, assessment history, coaching session history,
								AI-generated coaching interactions, personal insights, and
								related development records created through the Platform.
							</li>
							<li>
								If a user participates in BSPBlueprint through an
								employer-sponsored or organization-sponsored account, the
								user&apos;s ownership rights to their individual assessment and
								coaching data remain unchanged.
							</li>
							<li>
								Upon request, users may obtain a copy of their individual
								assessment results, reports, coaching history, and other
								personal development records maintained by BSPBlueprint, subject
								to reasonable verification and security procedures.
							</li>
							<li>
								If a user&apos;s employment or organizational relationship ends,
								BSPBlueprint may provide mechanisms that allow the user to
								retain access to, transfer, export, or establish an individual
								account for their personal assessment and coaching history,
								subject to the Company&apos;s then-current policies and
								technical capabilities.
							</li>
							<li>
								Nothing in an organization&apos;s subscription agreement shall
								transfer ownership of an individual&apos;s personal assessment
								and coaching history to the organization.
							</li>
						</ul>
						<p className={body}>
							This section does not apply to aggregated, anonymized,
							benchmarked, or de-identified data used by BSPBlueprint for
							research, analytics, product improvement, or reporting purposes.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className={sectionTitle}>18. Contact Us</h2>
						<p className={body}>BSPBlueprint</p>
						<p className={body}>41740 Six Mile Rd # 103</p>
						<p className={body}>Northville, MI 48168</p>
						<p className={body}>(888)-364-3583</p>
						<p className={body}>
							Email:{" "}
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
					{showTermsLink ? (
						<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
							<button
								type="button"
								onClick={handleTermsNav}
								className="cursor-pointer font-normal text-muted-foreground underline-offset-4 hover:text-link hover:underline"
							>
								{FOOTER_CONTENT.termsOfUse}
							</button>
						</div>
					) : null}
				</div>
			</footer>
		</div>
	);
}
