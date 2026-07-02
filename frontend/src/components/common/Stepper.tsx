import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepperProps } from "@/types";

export function Stepper({ steps, activeStep, className }: StepperProps) {
	return (
		<nav className={cn("flex flex-col", className)} aria-label="Progress">
			{steps.map((step, index) => {
				const isCompleted = index < activeStep;
				const isActive = index === activeStep;
				const isFuture = index > activeStep;

				return (
					<div key={step.id ?? index} className="flex flex-col">
						<div
							role="group"
							className="flex items-start gap-4 text-left w-full rounded-md"
							aria-current={isActive ? "step" : undefined}
							aria-label={
								isCompleted ? "Completed" : isActive ? "Current" : "Pending"
							}
						>
							<div className="flex flex-col items-center shrink-0">
								<span
									className={cn(
										"flex size-8 items-center justify-center rounded-full border text-sm font-semibold shrink-0 select-none",
										isCompleted &&
											"border-info bg-interactive-info text-primary-foreground",
										isActive && "border-info bg-background text-link",
										isFuture &&
											"border-border bg-background text-muted-foreground",
									)}
								>
									{isCompleted ? (
										<Check className="size-4" aria-hidden />
									) : (
										index + 1
									)}
								</span>
								{index < steps.length - 1 && (
									<div className="my-2 h-8 w-px bg-border" aria-hidden />
								)}
							</div>

							<div className="flex flex-col">
								<span
									className={cn(
										"font-semibold leading-tight select-none",
										isCompleted && "text-text-foreground",
										isActive && "text-link",
										isFuture && "text-muted-foreground",
									)}
								>
									{step.title}
								</span>
								<span
									className={cn(
										"text-sm leading-tight mt-1 text-text-secondary tracking-tighter select-none",
									)}
								>
									{step.subtitle}
								</span>
							</div>
						</div>
					</div>
				);
			})}
		</nav>
	);
}
