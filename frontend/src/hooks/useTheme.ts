import { useCallback, useEffect, useSyncExternalStore } from "react";
import { THEME_CONFIG } from "@/const";
import type { ThemeMode } from "@/types";

// Shared theme state with subscribers
let currentTheme: ThemeMode =
	typeof window !== "undefined"
		? (localStorage.getItem(THEME_CONFIG.storageKey) as ThemeMode) ||
			(THEME_CONFIG.light as ThemeMode)
		: (THEME_CONFIG.light as ThemeMode);

const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
	subscribers.add(callback);
	return () => subscribers.delete(callback);
}

function getSnapshot() {
	return currentTheme;
}

function setThemeInternal(newTheme: ThemeMode) {
	currentTheme = newTheme;
	localStorage.setItem(THEME_CONFIG.storageKey, newTheme);

	const root = document.documentElement;
	if (newTheme === THEME_CONFIG.dark) {
		root.classList.add(THEME_CONFIG.dark);
	} else {
		root.classList.remove(THEME_CONFIG.dark);
	}

	// Notify all subscribers
	subscribers.forEach((callback) => {
		callback();
	});
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	// Initialize theme on mount
	useEffect(() => {
		const root = document.documentElement;
		if (currentTheme === THEME_CONFIG.dark) {
			root.classList.add(THEME_CONFIG.dark);
		} else {
			root.classList.remove(THEME_CONFIG.dark);
		}
	}, []);

	const setTheme = useCallback((newTheme: ThemeMode) => {
		setThemeInternal(newTheme);
	}, []);

	const toggleTheme = useCallback(() => {
		const newTheme =
			currentTheme === THEME_CONFIG.light
				? (THEME_CONFIG.dark as ThemeMode)
				: (THEME_CONFIG.light as ThemeMode);
		setThemeInternal(newTheme);
	}, []);

	return { theme, setTheme, toggleTheme };
}
