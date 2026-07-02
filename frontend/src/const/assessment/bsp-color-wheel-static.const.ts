import {
	bspColorWheelColorCard,
	bspColorWheelQuadrantCard,
	bspColorWheelStyleInfoCard,
} from "@/assets/assessment/bsp-color-wheel";
import type { BspColorWheelStaticSectionId } from "@/types";

export const BSP_COLOR_WHEEL_STATIC_SECTIONS: Record<
	BspColorWheelStaticSectionId,
	{
		src: string;
		width: number;
		height: number;
		ariaLabel: string;
	}
> = {
	quadrant: {
		src: bspColorWheelQuadrantCard,
		width: 992,
		height: 512,
		ariaLabel:
			"Environment and interaction quadrant diagrams with explanatory captions",
	},
	color: {
		src: bspColorWheelColorCard,
		width: 992,
		height: 512,
		ariaLabel: "BSP color division wheel and numbered interactive color wheel",
	},
	styleInfo: {
		src: bspColorWheelStyleInfoCard,
		width: 992,
		height: 1034,
		ariaLabel:
			"BSP behavioral styles diagram with style pills, trait callouts, and connector lines",
	},
} as const;
