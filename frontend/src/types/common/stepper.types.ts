export interface StepperStep {
	id?: string;
	title: string;
	subtitle: string;
}

export interface StepperProps {
	steps: StepperStep[];
	activeStep: number;
	className?: string;
}
