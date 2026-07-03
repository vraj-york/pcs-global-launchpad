// Figma layer: "Welcome to the Config 2026 playground file" — node 4:19414
/*
 * SEMANTIC ANALYSIS
 * Figma node 4:19414: a dark welcome/intro hero.
 * - Left column (Figma x112/y240, column, gap 32px):
 *     • Two-line display heading (Inter 400, 72/72) — light tint #F3FFE3
 *     • Short description (Inter 400, 24/32, width 468)
 * - Right: a collage of floating product-preview widgets (Figma marketing art)
 * Pixel values mapped to index.css design tokens per project rules
 * (no raw hex, no Figma marketing art): bg-foreground (dark), text-background
 * for the light heading/body, heading-1 (48 ≈ largest token for the 72 display)
 * and heading-3 (24, exact). The right collage is rebuilt as a cluster of
 * "launch highlight" cards reusing the shared Card + brand-token accents.
 */
import {
	CalendarClock,
	type LucideIcon,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
	COACH_DASHBOARD_CONTENT,
	COACH_WELCOME_HIGHLIGHTS,
	type CoachWelcomeHighlight,
} from "@/const";
import { cn } from "@/lib/utils";

const C = COACH_DASHBOARD_CONTENT.welcome;

const HIGHLIGHT_ICONS: Record<CoachWelcomeHighlight["icon"], LucideIcon> = {
	sparkles: Sparkles,
	"trending-up": TrendingUp,
	"calendar-clock": CalendarClock,
};

const ACCENT_TILE: Record<CoachWelcomeHighlight["accent"], string> = {
	blue: "bg-brand-info",
	green: "bg-brand-green",
	yellow: "bg-brand-yellow",
};

// Slight rotations echo the floating-collage feel of the Figma widgets;
// straightened on hover.
const HIGHLIGHT_ROTATION = ["md:-rotate-2", "md:rotate-2", "md:-rotate-1"];

function HighlightCard({
	highlight,
	rotation,
}: {
	highlight: CoachWelcomeHighlight;
	rotation: string;
}) {
	const Icon = HIGHLIGHT_ICONS[highlight.icon];
	return (
		<Card
			className={cn(
				"flex-row items-center gap-3 p-4 shadow-lg transition-transform duration-200 hover:rotate-0",
				rotation,
			)}
		>
			<span
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-xl",
					ACCENT_TILE[highlight.accent],
				)}
			>
				<Icon className="size-5 text-white" aria-hidden />
			</span>
			<span className="text-small font-semibold text-card-foreground">
				{highlight.label}
			</span>
		</Card>
	);
}

export function WelcomeBanner() {
	return (
		<section className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-xl bg-foreground p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
			{/* Left column — Figma frame 4:19416 (column, gap 32px) */}
			<div className="flex flex-col gap-8">
				<h2 className="text-heading-1 font-normal leading-tight text-background">
					{C.title}
				</h2>
				<p className="max-w-[468px] text-heading-3 font-normal leading-relaxed text-background/90">
					{C.description}
				</p>
			</div>

			{/* Right column — launch highlights (rebuilt from Figma widget collage) */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{COACH_WELCOME_HIGHLIGHTS.map((highlight, index) => (
					<HighlightCard
						key={highlight.id}
						highlight={highlight}
						rotation={HIGHLIGHT_ROTATION[index % HIGHLIGHT_ROTATION.length]}
					/>
				))}
			</div>
		</section>
	);
}
