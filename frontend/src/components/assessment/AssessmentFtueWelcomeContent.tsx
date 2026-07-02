import { Brain, CircleCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_FTUE_WELCOME } from "@/const";
import type { AssessmentFtueWelcomeContentProps } from "@/types";

const copy = ASSESSMENT_FTUE_WELCOME;

export function AssessmentFtueWelcomeContent({
	onSeeMyBlueprint,
	isGenerating,
}: AssessmentFtueWelcomeContentProps) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 py-8 md:gap-8 md:py-16">
			<div className="flex min-h-8 items-center justify-center gap-1.5 rounded-3xl bg-background px-4 py-0.5 text-mini font-semibold leading-mini tracking-wide text-link shadow-xs">
				<Brain
					className="size-3.5 shrink-0 text-link"
					strokeWidth={2}
					aria-hidden
				/>
				<span>{copy.tag}</span>
			</div>

			<div className="flex max-w-4xl flex-col items-center gap-6 text-center">
				<h1 className="text-balance text-heading-1 font-semibold leading-heading-1 tracking-heading-1 text-brand-primary">
					{copy.title}
				</h1>
				<p className="text-balance text-heading-4 font-semibold leading-heading-4 text-text-foreground">
					{copy.subtitle}
				</p>
			</div>

			<div className="flex w-full max-w-lg flex-col items-center gap-8 rounded-3xl border border-border bg-background p-8">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-interactive-success p-2 text-light-same"
					aria-hidden
				>
					<CircleCheck className="size-12 shrink-0" strokeWidth={1.5} />
				</div>
				<p className="text-balance text-center text-regular font-medium leading-regular text-text-foreground">
					{copy.body}
				</p>
			</div>

			<div className="flex flex-col items-center gap-6">
				<Button
					type="button"
					size="lg"
					icon={Sparkles}
					isLoading={isGenerating}
					onClick={onSeeMyBlueprint}
				>
					{copy.seeMyBlueprintCta}
				</Button>
				<div className="flex items-center justify-center gap-1.5">
					<Zap
						className="size-5 shrink-0 text-muted-foreground"
						strokeWidth={2}
						aria-hidden
					/>
					<p className="text-mini font-medium leading-mini tracking-wide text-muted-foreground">
						{copy.footer}
					</p>
				</div>
			</div>
		</div>
	);
}
