export const APP_CONFIG = {
	name: "Blueprint",
	version: "1.0",
} as const;

/** Display name for copyright lines (matches marketing). */
export const COPYRIGHT_BRAND = "BSPBlueprint";

export const FOOTER_CONTENT = {
	versionPrefix: "Version",
	privacyPolicy: "Privacy Policy",
	termsOfUse: "Terms of Use",
	separator: "|",
} as const;

export const THEME_CONFIG = {
	storageKey: "bsp-theme",
	light: "light",
	dark: "dark",
} as const;

export const THEME_TOGGLE_LABELS = {
	switchToDark: "Switch to dark mode",
	switchToLight: "Switch to light mode",
} as const;

export const ICON_SIZES = {
	default: 20,
	small: 18,
	large: 24,
} as const;

/** Loading caption for app loaders (visible and screen reader). */
export const APP_LOADING_MESSAGE = "Loading...";
