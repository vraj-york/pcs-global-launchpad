import { useMemo } from "react";
import { PASSWORD_STRENGTH } from "@/const";
import { cn } from "@/lib/utils";
import type { PasswordStrengthIndicatorProps } from "@/types";
import { calculatePasswordStrength } from "@/utils";

export function PasswordStrengthIndicator({
	password,
	className,
}: PasswordStrengthIndicatorProps) {
	const strength = useMemo(
		() => calculatePasswordStrength(password),
		[password],
	);

	if (!password || strength === "none") {
		return null;
	}

	const strengthConfig = PASSWORD_STRENGTH[strength];
	const progressWidth = (strengthConfig.level / 3) * 100;

	return (
		<div className={cn("space-y-1", className)}>
			<div className="h-2 w-full overflow-hidden rounded-xl bg-border">
				<div
					className={cn(
						"h-full rounded-xl transition-all duration-500 ease-out",
						strengthConfig.color,
					)}
					style={{ width: `${progressWidth}%` }}
				/>
			</div>
			<p
				className={cn(
					"text-mini font-medium transition-colors duration-300",
					strength === "poor" && "text-destructive",
					strength === "average" && "text-warning",
					strength === "strong" && "text-success",
				)}
			>
				{strengthConfig.label}
			</p>
		</div>
	);
}
