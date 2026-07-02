import { ChevronLeft } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	backLabel?: string;
	onBack?: () => void;
	className?: string;
	children?: React.ReactNode;
}

export function PageHeader({
	title,
	backLabel = "Back",
	onBack,
	className,
	children,
}: PageHeaderProps) {
	const navigate = useNavigate();

	const handleBack = () => {
		if (onBack) onBack();
		else navigate(-1);
	};

	return (
		<div className={cn("pb-6", className)}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-4 min-w-0">
					<Button
						type="button"
						variant="outline"
						icon={ChevronLeft}
						onClick={handleBack}
						aria-label={backLabel}
					>
						{backLabel}
					</Button>
					<h1
						className="min-h-6 max-w-md truncate text-heading-4 font-semibold leading-[var(--leading-heading-4)] text-text-foreground opacity-100"
						style={{
							fontFamily:
								"var(--bspFontDefinitionsFontFamilyHeadings, inherit)",
						}}
					>
						{title}
					</h1>
				</div>
				{children ? <div className="shrink-0">{children}</div> : null}
			</div>
		</div>
	);
}
