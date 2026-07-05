// Figma layer: "What's coming soon" (PCS Global Coach Persona) — node 4:19398
/*
 * SEMANTIC ANALYSIS
 * Figma node 4:19398 "What's coming soon": a dark full-bleed promo hero.
 * - Left column (Figma x112/y84, column, gap 32px):
 *     • Display heading (Inter 400, 72/72) — light tint #F3FFE3
 *     • Description (Inter 400, 24/32) + bullet list of upcoming features
 *     • CTA "next-link" (white bg, radius 8, pad 12/16) → underlined link + "→"
 * - Right: product preview image (610×343) — Figma marketing collage
 * Pixel values mapped to index.css design tokens per project rules
 * (no raw hex, no Figma marketing art): bg-foreground (dark), text-background
 * for the light heading/body, heading-1 (48 ≈ largest token for the 72 display),
 * heading-3 (24, exact) for the body, and a brand-token gradient illustration
 * slot at the Figma 610/343 ratio. CTA reuses the shared Button.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { COACH_DASHBOARD_CONTENT } from "@/const";
import type { CoachBetaFeature } from "@/types";

const C = COACH_DASHBOARD_CONTENT.comingSoon;

export function ComingSoon({
	features,
	onRequestEarlyAccess,
}: {
	features?: CoachBetaFeature[];
	onRequestEarlyAccess?: () => void | Promise<void>;
}) {
	const featureLabels = features?.length
		? features.map((feature) => feature.title)
		: C.features;

	return (
		<section className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-xl bg-foreground p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
			{/* Left column — Figma frame 4:19400 (column, gap 32px) */}
			<div className="flex flex-col gap-8">
				<h2 className="text-heading-1 font-normal leading-tight text-background">
					{C.title}
				</h2>

				<div className="flex flex-col gap-4">
					<p className="text-heading-3 font-normal leading-relaxed text-background/90">
						{C.description}
					</p>
					<ul className="flex flex-col gap-1.5 pl-6">
						{featureLabels.map((feature) => (
							<li
								key={feature}
								className="list-disc text-heading-3 font-normal text-background/90 marker:text-background/50"
							>
								{feature}
							</li>
						))}
					</ul>
				</div>

				{/* next-link — white pill, underlined label + arrow */}
				{onRequestEarlyAccess ? (
					<Button
						size="lg"
						className="w-fit bg-background text-foreground hover:bg-background/90"
						onClick={() => void onRequestEarlyAccess()}
					>
						<span className="underline underline-offset-4">{C.cta}</span>
						<ArrowRight className="size-4 shrink-0" aria-hidden />
					</Button>
				) : (
					<Button
						asChild
						size="lg"
						className="w-fit bg-background text-foreground hover:bg-background/90"
					>
						<Link to={C.ctaHref}>
							<span className="underline underline-offset-4">{C.cta}</span>
							<ArrowRight className="size-4 shrink-0" aria-hidden />
						</Link>
					</Button>
				)}
			</div>

			{/* Right column — product preview slot (Figma image 610×343) */}
			<div className="flex aspect-[610/343] w-full items-center justify-center rounded-xl bg-[linear-gradient(134deg,var(--bspBlueBase)_10%,var(--bspBlue800)_100%)]">
				<Sparkles className="size-16 text-white/90" aria-hidden />
			</div>
		</section>
	);
}
