import { Loader2 } from "lucide-react";
import { APP_LOADING_MESSAGE } from "@/const";
import { cn } from "@/lib/utils";
import type { AppLoaderProps } from "@/types";

export function AppLoader({
	fullScreen = false,
	showMessage = false,
	className,
}: AppLoaderProps) {
	const spinner = (
		<Loader2
			className="size-8 shrink-0 animate-spin text-primary"
			aria-hidden
		/>
	);

	const body = showMessage ? (
		<div className="flex flex-col items-center gap-4">
			{spinner}
			<p className="text-sm text-text-secondary">{APP_LOADING_MESSAGE}</p>
		</div>
	) : (
		<>
			{spinner}
			<span className="sr-only">{APP_LOADING_MESSAGE}</span>
		</>
	);

	return (
		<div
			className={
				fullScreen
					? "flex h-screen w-screen items-center justify-center bg-background"
					: cn("flex items-center justify-center", className)
			}
			role="status"
		>
			{body}
		</div>
	);
}
