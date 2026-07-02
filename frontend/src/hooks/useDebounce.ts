import { useEffect, useState } from "react";

/**
 * Returns a debounced value that updates only after the source value has
 * remained unchanged for the given delay (in milliseconds). Default delay 1000ms.
 */
export function useDebounce<T>(value: T, delay: number = 800): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => window.clearTimeout(timer);
	}, [value, delay]);

	return debouncedValue;
}
