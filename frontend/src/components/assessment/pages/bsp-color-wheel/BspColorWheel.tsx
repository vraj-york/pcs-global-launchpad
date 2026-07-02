import {
	ASSESSMENT_REPORT_COLOR_WHEEL,
	ASSESSMENT_REPORT_RESULTS_PAGE,
} from "@/const";
import { cn } from "@/lib/utils";
import { ColorWheelStaticSection } from "./ColorWheelStaticSection";

export function BspColorWheel() {
	return (
		<section
			id={ASSESSMENT_REPORT_RESULTS_PAGE.colorWheelSectionId}
			className={ASSESSMENT_REPORT_RESULTS_PAGE.sectionShellClassName}
		>
			<header className="flex flex-col gap-2">
				<h2
					className={cn(
						"text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2",
						"text-foreground",
					)}
				>
					{ASSESSMENT_REPORT_COLOR_WHEEL.sectionTitle}
				</h2>
				<p className="text-regular font-medium leading-regular text-muted-foreground">
					{ASSESSMENT_REPORT_COLOR_WHEEL.sectionSubtitle}
				</p>
			</header>

			<ColorWheelStaticSection sectionId="quadrant" />
			<ColorWheelStaticSection sectionId="color" />
			<ColorWheelStaticSection sectionId="styleInfo" />
		</section>
	);
}
