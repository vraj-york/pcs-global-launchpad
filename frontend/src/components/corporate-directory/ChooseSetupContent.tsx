import { Check, SlidersVertical, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import {
	CHOOSE_SETUP_CONTENT,
	CORPORATE_DIRECTORY_PAGE_CONTENT,
	ROUTES,
} from "@/const";

type SetupStep = {
	number: number;
	title: string;
	subtitle: string;
};

function SetupStepItem({ step }: { step: SetupStep }) {
	return (
		<div className="flex items-start gap-2">
			<span className="shrink-0 size-6 rounded-full bg-card-foreground text-muted-foreground text-mini font-medium flex items-center justify-center">
				{step.number}
			</span>
			<div className="min-w-0">
				<p className="text-small font-normal text-text-foreground leading-tight">
					{step.title}
				</p>
				<p className="text-mini text-muted-foreground leading-tight">
					{step.subtitle}
				</p>
			</div>
		</div>
	);
}

function FeatureList({
	features,
	showCheckIcon = false,
}: {
	features: readonly string[];
	showCheckIcon?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small font-normal text-muted-foreground">
			{features.map((feature, index) => (
				<span key={feature} className="flex items-center gap-1">
					{showCheckIcon && <Check className="size-3 text-icon-success" />}
					{feature}
					{index < features.length - 1 && !showCheckIcon && (
						<span className="ml-2">|</span>
					)}
				</span>
			))}
		</div>
	);
}

export function ChooseSetupContent() {
	const { quickSetup, advancedSetup } = CHOOSE_SETUP_CONTENT;
	const navigate = useNavigate();
	const [quickHovered, setQuickHovered] = useState(false);
	const [advancedHovered, setAdvancedHovered] = useState(false);

	return (
		<>
			<PageHeader
				title={CORPORATE_DIRECTORY_PAGE_CONTENT.chooseSetupPageTitle}
				backLabel={CORPORATE_DIRECTORY_PAGE_CONTENT.backButton}
			/>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
				{/* Quick Setup Card */}
				<Card
					className="relative h-full border bg-background shadow-md transition-all duration-500 hover:border-interactive-primary group"
					onMouseEnter={() => setQuickHovered(true)}
					onMouseLeave={() => setQuickHovered(false)}
				>
					<CardHeader className="pb-0">
						<div className="flex items-start justify-between gap-4">
							<div className="size-16 rounded-lg bg-brand-gray-bg group-hover:bg-interactive-secondary transition-all duration-500 flex items-center justify-center">
								<Zap className="size-7 text-icon-primary group-hover:text-icon-inverse transition-all duration-500" />
							</div>
							<span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-interactive-info text-light-same font-medium">
								<Sparkles className="size-4" />
								{quickSetup.badge}
							</span>
						</div>

						<div className="mt-4 space-y-2">
							<h2 className="text-regular font-semibold text-text-foreground">
								{quickSetup.title}
							</h2>
							<p className="text-small text-text-secondary leading-relaxed">
								{quickSetup.description}
							</p>
						</div>

						<div className="mt-3 flex items-center gap-1">
							<Check className="size-4 text-icon-success" />
							<FeatureList features={quickSetup.features} />
						</div>
					</CardHeader>

					<CardContent className="flex-1 pt-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{quickSetup.steps.map((step) => (
								<SetupStepItem key={step.number} step={step} />
							))}
						</div>
					</CardContent>

					<CardFooter className="mt-auto w-full">
						<Button
							className="w-full transition-all duration-500"
							size="lg"
							variant={quickHovered ? "default" : "outline"}
							onClick={() => navigate(ROUTES.corporateDirectory.add)}
						>
							{quickSetup.buttonText}
						</Button>
					</CardFooter>
				</Card>

				{/* Advanced Setup Card */}
				<Card
					className="relative h-full border bg-background shadow-md transition-all duration-500 hover:border-interactive-primary group"
					onMouseEnter={() => setAdvancedHovered(true)}
					onMouseLeave={() => setAdvancedHovered(false)}
				>
					<CardHeader className="pb-0">
						<div className="size-16 rounded-lg bg-brand-gray-bg group-hover:bg-interactive-secondary transition-all duration-500 flex items-center justify-center">
							<SlidersVertical className="size-7 text-icon-primary group-hover:text-icon-inverse transition-all duration-500" />
						</div>

						<div className="mt-4 space-y-2">
							<h2 className="text-regular font-semibold text-text-foreground">
								{advancedSetup.title}
							</h2>
							<p className="text-small text-text-secondary leading-relaxed">
								{advancedSetup.description}
							</p>
						</div>

						<div className="mt-3 flex items-center gap-1">
							<Check className="size-4 text-icon-success" />
							<FeatureList features={advancedSetup.features} />
						</div>
					</CardHeader>

					<CardContent className="flex-1 pt-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{advancedSetup.steps.map((step) => (
								<SetupStepItem key={step.number} step={step} />
							))}
						</div>
					</CardContent>

					<CardFooter className="mt-auto w-full">
						<Button
							className="w-full transition-all duration-500"
							size="lg"
							variant={advancedHovered ? "default" : "outline"}
							onClick={() => navigate(ROUTES.corporateDirectory.addAdvanced)}
						>
							{advancedSetup.buttonText}
						</Button>
					</CardFooter>
				</Card>
			</div>
		</>
	);
}
