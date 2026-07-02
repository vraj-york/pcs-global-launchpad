import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICON_SIZES, THEME_TOGGLE_LABELS } from "@/const";
import { useTheme } from "@/hooks";
import type { ThemeMode } from "@/types";

type ThemeToggleProps = {
	className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { theme, toggleTheme } = useTheme();

	const iconMap: Record<ThemeMode, React.ReactNode> = {
		light: <Moon size={ICON_SIZES.default} />,
		dark: <Sun size={ICON_SIZES.default} />,
	};

	const labelMap: Record<ThemeMode, string> = {
		light: THEME_TOGGLE_LABELS.switchToDark,
		dark: THEME_TOGGLE_LABELS.switchToLight,
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className={className}
			aria-label={labelMap[theme]}
		>
			{iconMap[theme]}
		</Button>
	);
}
