import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				"text-mini",
				"text-small",
				"text-regular",
				"text-heading-1",
				"text-heading-2",
				"text-heading-3",
				"text-heading-4",
			],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
