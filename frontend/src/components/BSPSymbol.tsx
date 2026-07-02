import { APP_CONFIG } from "@/const";

type BSPSymbolProps = {
	className?: string;
};

export function BSPSymbol({ className }: BSPSymbolProps) {
	return (
		<div className={`flex items-center shrink-0 ${className ?? ""}`}>
			<img
				src="/BSPSymbol.svg"
				alt={`${APP_CONFIG.name} symbol`}
				className="h-7 w-auto"
			/>
		</div>
	);
}
