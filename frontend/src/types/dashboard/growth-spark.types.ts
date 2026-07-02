import type { ReactNode } from "react";

export type GrowthSparkSource = "template" | "llm" | "cache";

export type GrowthSparkData = {
	title: string;
	body: string;
	source: GrowthSparkSource;
	sparkDate: string;
	styleTitle: string | null;
};

export type GrowthSparkCardPhase = "loading" | "ready" | "error" | "hidden";

export type GrowthSparkCardProps = {
	className?: string;
};

export type GrowthSparkCardShellProps = {
	className?: string;
	children: ReactNode;
	ariaLabel?: string;
};

export type ParsedGrowthSparkContent = {
	headline: string;
	paragraphs: string[];
};
