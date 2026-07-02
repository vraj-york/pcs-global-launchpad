import { BSPLogo } from "@/components/BSPLogo";
import { END_USER_FTUE_POWERED_BY } from "@/const";
import type { EndUserFtueLayoutProps } from "@/types";

export function EndUserFtueLayout({ children }: EndUserFtueLayoutProps) {
	return (
		<div className="relative min-h-screen w-full overflow-x-hidden bg-card">
			<div
				className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
				aria-hidden
			>
				<div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/60" />
				<div className="absolute -bottom-48 -left-44 size-96 rounded-full bg-muted/70 blur-3xl md:-bottom-52 md:-left-52 md:size-[36rem]" />
				<div className="absolute -bottom-40 right-0 size-96 rounded-full bg-warning/25 blur-3xl md:-bottom-48 md:right-8 md:size-[40rem]" />
				<div className="absolute -right-28 -top-36 size-96 rounded-full bg-info/20 blur-3xl md:-right-20 md:-top-28 md:size-[40rem]" />
				<div className="absolute left-1/4 top-1/4 size-80 -translate-x-1/4 rounded-full bg-primary/12 blur-3xl md:size-96" />
				<div className="absolute right-1/3 top-1/2 size-72 rounded-full bg-brand-secondary/25 blur-3xl md:size-96" />
				<div className="absolute bottom-1/3 left-1/2 size-64 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl md:size-80" />
			</div>

			<div
				className="pointer-events-none absolute -left-14 -top-36 z-[1] md:-left-16 md:-top-44"
				aria-hidden
			>
				<div className="relative size-52 md:size-72">
					<div className="absolute -inset-10 rounded-full bg-muted/35 blur-3xl md:-inset-14" />
					<div className="absolute inset-0 rounded-full border border-border/30 bg-background/50 blur-xl" />
					<div className="absolute inset-6 rounded-full bg-muted/25 blur-2xl md:inset-10" />
				</div>
			</div>

			<div
				className="pointer-events-none absolute inset-0 z-[2] backdrop-blur-3xl bg-border/25"
				aria-hidden
			/>

			<div className="relative z-10 flex min-h-screen w-full flex-col p-4">
				<header className="relative flex w-full shrink-0 items-start gap-4 pt-3.5 md:pt-0">
					<div className="relative z-10 flex flex-col">
						<div className="origin-left scale-[0.56]">
							<BSPLogo variant="auth" />
						</div>
						<p className="text-mini font-medium leading-mini tracking-wide text-disabled">
							{END_USER_FTUE_POWERED_BY}
						</p>
					</div>
				</header>

				<div className="flex flex-1 flex-col gap-8 pt-6">{children}</div>
			</div>
		</div>
	);
}
