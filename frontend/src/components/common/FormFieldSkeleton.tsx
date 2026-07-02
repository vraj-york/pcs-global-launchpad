import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type FormFieldSkeletonProps = {
	/** Show a label-shaped skeleton above the input. Default true */
	showLabel?: boolean;
	/** Optional class name for the root */
	className?: string;
};

/** Single form field skeleton (label + input) for loading states */
export function FormFieldSkeleton({
	showLabel = true,
	className,
}: FormFieldSkeletonProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{showLabel && (
				<Skeleton className="h-4 w-24 rounded bg-card" aria-hidden />
			)}
			<Skeleton className="h-10 w-full rounded-md bg-card" aria-hidden />
		</div>
	);
}

export type FormStepSkeletonProps = {
	/** Number of field rows. Default 8 */
	fieldCount?: number;
	/** Optional class name for the root */
	className?: string;
};

/** Grid of form field skeletons for form step loading (e.g. Add Corporation steps) */
export function FormStepSkeleton({
	fieldCount = 8,
	className,
}: FormStepSkeletonProps) {
	return (
		<div className={cn("space-y-6", className)} aria-busy>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{Array.from({ length: fieldCount }, (_, i) => (
					<FormFieldSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
