import { Info } from "lucide-react";
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FormInputLabelProps = {
	htmlFor: string;
	label: string;
	tooltip?: string;
	required?: boolean;
};

type FormInputProps = {
	id: string;
	label: string;
	type?: string;
	placeholder?: string;
	error?: string;
	autoComplete?: string;
	className?: string;
	rightElement?: React.ReactNode;
	required?: boolean;
	tooltip?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function FormInputLabel({
	htmlFor,
	label,
	tooltip,
	required,
}: FormInputLabelProps) {
	return (
		<div className={cn(tooltip && "flex min-h-5 items-center gap-1")}>
			<Label
				htmlFor={htmlFor}
				className={cn(
					"text-small font-medium text-text-foreground",
					tooltip && "leading-snug",
				)}
			>
				{required && <span className="text-destructive">*</span>}
				{label}
			</Label>
			{tooltip ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={tooltip}
							tabIndex={0}
						>
							<Info className="size-3.5" aria-hidden />
						</button>
					</TooltipTrigger>
					<TooltipContent sideOffset={6} className="max-w-xs">
						{tooltip}
					</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	);
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
	(
		{
			id,
			label,
			type = "text",
			placeholder,
			error,
			autoComplete,
			className = "",
			rightElement,
			required,
			tooltip,
			...props
		},
		ref,
	) => {
		return (
			<div className="space-y-2">
				<FormInputLabel
					htmlFor={id}
					label={label}
					tooltip={tooltip}
					required={required}
				/>
				<div className="relative">
					<Input
						ref={ref}
						id={id}
						type={type}
						placeholder={placeholder}
						autoComplete={autoComplete}
						className={`disabled:opacity-100 disabled:bg-card disabled:text-muted-foreground h-10 ${rightElement ? "pr-10" : ""} ${
							error ? "border-destructive" : ""
						} ${className}`}
						aria-invalid={!!error}
						{...props}
					/>
					{rightElement}
				</div>
				{error && <p className="text-mini text-destructive">{error}</p>}
			</div>
		);
	},
);

FormInput.displayName = "FormInput";
