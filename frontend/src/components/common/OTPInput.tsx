import { Fragment, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type OTPInputProps = {
	length: number;
	value: string[];
	onChange: (value: string[]) => void;
	error?: boolean;
};

export function OTPInput({ length, value, onChange, error }: OTPInputProps) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const handleInputChange = (index: number, inputValue: string) => {
		// Only allow single digit
		if (inputValue.length > 1) {
			inputValue = inputValue.slice(-1);
		}

		// Only allow numbers
		if (inputValue && !/^\d$/.test(inputValue)) return;

		const newCode = [...value];
		newCode[index] = inputValue;
		onChange(newCode);

		// Auto-focus next input
		if (inputValue && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		// Handle backspace - move to previous input
		if (e.key === "Backspace" && !value[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text");
		// Remove non-digits first, then slice to length
		const digits = pastedData.replace(/\D/g, "").slice(0, length);

		if (digits) {
			const newCode = [...value];
			for (let i = 0; i < digits.length && i < length; i++) {
				newCode[i] = digits[i];
			}
			onChange(newCode);

			// Focus the next empty input or last input
			const nextEmptyIndex = newCode.findIndex((c) => !c);
			const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
			inputRefs.current[focusIndex]?.focus();
		}
	};

	const splitAfterIndex = Math.floor(length / 2) - 1;

	return (
		<div className="flex w-full items-center gap-2">
			{value.map((digit, index) => (
				<Fragment key={index}>
					<Input
						ref={(el) => {
							inputRefs.current[index] = el;
						}}
						type="text"
						inputMode="numeric"
						maxLength={1}
						value={digit}
						onChange={(e) => handleInputChange(index, e.target.value)}
						onKeyDown={(e) => handleKeyDown(index, e)}
						onPaste={index === 0 ? handlePaste : undefined}
						className={cn(
							"h-9 min-w-0 flex-1 rounded-lg bg-background px-0 text-center text-small font-medium leading-small",
							error && "border-destructive focus-visible:ring-destructive",
						)}
					/>
					{index === splitAfterIndex && (
						<div
							className="flex h-9 w-3 shrink-0 items-center justify-center"
							aria-hidden
						>
							<Separator
								orientation="horizontal"
								decorative
								className="w-full"
							/>
						</div>
					)}
				</Fragment>
			))}
		</div>
	);
}
