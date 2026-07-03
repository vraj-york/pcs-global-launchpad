// Figma layer: "What launched" (PCS Global Coach Persona) — node 4:19407
/*
 * SEMANTIC ANALYSIS
 * Figma node 4:19407: a dark "explore every update" hero.
 * - Left column (Figma x112/y144, column, gap 32px):
 *     • Two-line display heading (Inter 400, 72/72) — light tint #F3FFE3
 *     • Description (Inter 400, 24/32, width 468): intro line + a bulleted list
 *       of underlined links + a trailing paragraph with an inline link
 * - Right: a "Pages" navigation panel screenshot (461×489, radius 16), with one
 *   item highlighted.
 * Pixel values mapped to index.css design tokens per project rules
 * (no raw hex, no Figma marketing art): bg-foreground (dark), text-background
 * for the light heading/body, heading-1 (48 ≈ largest token for the 72 display)
 * and heading-3 (24, exact). Links reuse text-link tokens. The right panel is
 * rebuilt as a light Card "updates" list (reusing Card + Separator).
 */
import { PanelLeft, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	COACH_DASHBOARD_CONTENT,
	COACH_LAUNCH_UPDATES,
} from "@/const";

const C = COACH_DASHBOARD_CONTENT.whatLaunched;

function UpdatesPanel() {
	return (
		<Card className="gap-0 p-0">
			{/* Header — panel title + collapse affordance */}
			<div className="flex items-center justify-between gap-2 p-4">
				<span className="text-small font-semibold text-card-foreground">
					{C.panelTitle}
				</span>
				<PanelLeft className="size-5 text-muted-foreground" aria-hidden />
			</div>

			{/* Section label + actions */}
			<div className="flex items-center justify-between gap-2 px-4 pb-2">
				<span className="text-mini font-medium text-muted-foreground">
					{C.panelSectionLabel}
				</span>
				<div className="flex items-center gap-3">
					<Search
						className="size-4 text-muted-foreground"
						aria-label={C.searchLabel}
					/>
					<Plus
						className="size-4 text-muted-foreground"
						aria-label={C.addLabel}
					/>
				</div>
			</div>

			{/* Active item */}
			<div className="px-2">
				<div className="rounded-md bg-muted px-2 py-2 text-small font-medium text-text-foreground">
					{C.panelActiveItem}
				</div>
			</div>

			<Separator className="my-2" />

			{/* Update items — mirror the left-hand links */}
			<ul className="flex flex-col px-2 pb-3">
				{COACH_LAUNCH_UPDATES.map((update) => (
					<li key={update.id}>
						<Link
							to={update.href}
							className="block rounded-md px-2 py-2 text-small text-muted-foreground hover:bg-muted hover:text-text-foreground"
						>
							{update.label}
						</Link>
					</li>
				))}
			</ul>
		</Card>
	);
}

export function WhatLaunched() {
	return (
		<section className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-xl bg-foreground p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
			{/* Left column — Figma frame 4:19409 (column, gap 32px) */}
			<div className="flex flex-col gap-8">
				<h2 className="text-heading-1 font-normal leading-tight text-background">
					{C.title}
				</h2>

				<div className="flex max-w-[468px] flex-col gap-4 text-heading-3 font-normal leading-relaxed text-background/90">
					<p>{C.intro}</p>
					<ul className="flex flex-col gap-1 pl-6">
						{COACH_LAUNCH_UPDATES.map((update) => (
							<li key={update.id} className="list-disc marker:text-background/50">
								<Link
									to={update.href}
									className="text-link underline underline-offset-4 hover:text-link-hover"
								>
									{update.label}
								</Link>
							</li>
						))}
					</ul>
					<p>
						{C.footnotePrefix}{" "}
						<Link
							to={C.footnoteHref}
							className="text-link underline underline-offset-4 hover:text-link-hover"
						>
							{C.footnoteLink}
						</Link>{" "}
						{C.footnoteSuffix}
					</p>
				</div>
			</div>

			{/* Right column — updates panel (rebuilt from Figma pages panel) */}
			<div className="flex justify-center lg:justify-end">
				<div className="w-full max-w-[461px]">
					<UpdatesPanel />
				</div>
			</div>
		</section>
	);
}
