export type DetailRowProps = {
	label: string;
	value?: string | null;
	children?: React.ReactNode;
	emptyPlaceholder?: string;
};

export function DetailRow({
	label,
	value,
	children,
	emptyPlaceholder,
}: DetailRowProps) {
	const displayValue =
		value != null && value !== "" ? value : (emptyPlaceholder ?? "—");
	return (
		<div className="flex min-h-11 items-center justify-between gap-4 border-b border-border pb-3 pt-0 last:border-b-0">
			<span className="shrink-0 text-small font-normal text-text-secondary">
				{label}
			</span>
			{children !== undefined ? (
				<span className="inline-flex items-center text-right text-small font-medium text-text-foreground">
					{children}
				</span>
			) : (
				<span className="inline-flex items-center justify-end text-right text-small font-normal text-text-foreground">
					{displayValue}
				</span>
			)}
		</div>
	);
}
