// Figma layer: "Resources" (PCS Global Coach Persona) — node 4:19379
/*
 * SEMANTIC ANALYSIS
 * Figma node 4:19379 "Resources": a dark section holding three resource cards.
 * Each card (590×640) = colorful illustration area (590×442) on top + a tinted
 * label panel (590×198) below with a bold heading (Inter 700, 32/40, -0.01em)
 * that ends in an underlined link.
 * - Cards → mapped from COACH_RESOURCES (data-driven, no dead links)
 * - Whole card → navigable link to the resource (React Router)
 * - Hover / focus-visible states wired for keyboard + pointer users
 * Pixel values mapped to index.css design tokens per project rules
 * (no raw hex, no Figma marketing art): brand-token gradients for the
 * illustration, feedback-bg tints for the panels, heading-2 + leading-tight
 * (30/1.25 ≈ Figma 32/40).
 */
import { BookOpen, LifeBuoy, type LucideIcon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
	COACH_DASHBOARD_CONTENT,
	COACH_RESOURCES,
	type CoachResource,
} from "@/const";
import { cn } from "@/lib/utils";

const C = COACH_DASHBOARD_CONTENT.resources;

const RESOURCE_ICONS: Record<CoachResource["icon"], LucideIcon> = {
	"book-open": BookOpen,
	sparkles: Sparkles,
	"life-buoy": LifeBuoy,
};

// Illustration gradient per accent — matches the vibrant Figma image area
// using brand tokens defined in index.css.
const ACCENT_ILLUSTRATION: Record<CoachResource["accent"], string> = {
	green:
		"bg-[linear-gradient(134deg,var(--bspGreenBase)_10%,var(--bspGreen700)_100%)]",
	blue: "bg-[linear-gradient(134deg,var(--bspBlueBase)_10%,var(--bspBlue800)_100%)]",
	red: "bg-[linear-gradient(134deg,var(--bspRedBase)_10%,var(--bspRed700)_100%)]",
};

// Label-panel tint per accent — matches the Figma colored footer panels.
const ACCENT_PANEL: Record<CoachResource["accent"], string> = {
	green: "bg-success-bg",
	blue: "bg-info-bg",
	red: "bg-error-bg",
};

function ResourceCard({ resource }: { resource: CoachResource }) {
	const Icon = RESOURCE_ICONS[resource.icon];

	return (
		<Link
			to={resource.href}
			aria-label={`${resource.lead} ${resource.connector} ${resource.linkLabel}`}
			className="group/resource block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<Card className="h-full gap-0 p-0 transition-shadow group-hover/resource:shadow-lg">
				{/* Illustration area — Figma image 590×442 (ratio 590/442) */}
				<div
					className={cn(
						"flex aspect-[590/442] w-full items-center justify-center",
						ACCENT_ILLUSTRATION[resource.accent],
					)}
				>
					<Icon
						className="size-16 text-white/90 transition-transform duration-200 group-hover/resource:scale-110"
						aria-hidden
					/>
				</div>

				{/* Label panel — Figma footer 590×198, heading 700 ending in a link */}
				<div className={cn("flex flex-1 flex-col p-6", ACCENT_PANEL[resource.accent])}>
					<h3 className="text-heading-2 font-bold leading-tight tracking-heading-2 text-foreground">
						{resource.lead}{" "}
						<span className="font-normal">{resource.connector}</span>{" "}
						<span className="text-link underline underline-offset-4 group-hover/resource:text-link-hover">
							{resource.linkLabel}
						</span>
					</h3>
				</div>
			</Card>
		</Link>
	);
}

export function Resources() {
	return (
		<section className="flex flex-col gap-6 rounded-xl bg-foreground p-6 sm:p-10">
			<header className="flex flex-col gap-0.5">
				<h2 className="text-heading-4 font-semibold text-background">
					{C.title}
				</h2>
				<p className="text-small text-background/70">{C.subtitle}</p>
			</header>

			{COACH_RESOURCES.length === 0 ? (
				<p className="text-small text-background/70">{C.emptyState}</p>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					{COACH_RESOURCES.map((resource) => (
						<ResourceCard key={resource.id} resource={resource} />
					))}
				</div>
			)}
		</section>
	);
}
