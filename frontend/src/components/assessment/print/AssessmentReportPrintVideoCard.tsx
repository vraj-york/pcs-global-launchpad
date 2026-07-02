import { Play } from "lucide-react";
import { useState } from "react";
import {
	ASSESSMENT_REPORT_INTRO_SECTION,
	ASSESSMENT_REPORT_INTRO_VIDEO,
	ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID,
} from "@/const";
import { buildYoutubeUrl } from "@/utils";

const introWatchUrl = buildYoutubeUrl(
	ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID,
	"watch",
);

export function AssessmentReportPrintVideoCard() {
	const [thumbnailSrc, setThumbnailSrc] = useState(() =>
		buildYoutubeUrl(ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID, "thumbnail", {
			quality: "hqdefault",
		}),
	);

	const handleThumbnailError = () => {
		setThumbnailSrc(
			buildYoutubeUrl(ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID, "thumbnail", {
				quality: "mqdefault",
			}),
		);
	};

	return (
		<a
			href={introWatchUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="relative isolate h-[230px] w-full shrink-0 overflow-hidden rounded-xl bg-foreground print:[print-color-adjust:exact]"
			aria-label={ASSESSMENT_REPORT_INTRO_VIDEO.openVideoCard}
		>
			<img
				src={thumbnailSrc}
				alt=""
				loading="eager"
				decoding="sync"
				data-print-cover-image
				className="absolute inset-0 size-full object-cover object-center print:object-cover print:object-center opacity-90"
				onError={handleThumbnailError}
			/>
			<div className="absolute inset-0 bg-gradient-to-b from-background/40 via-foreground/60 to-foreground/80" />
			<div className="relative z-10 flex size-full flex-col items-center justify-center gap-[8px] px-4 py-6 text-center">
				<div
					className="flex size-14 shrink-0 items-center justify-center rounded-full bg-background text-primary"
					aria-hidden
				>
					<Play className="size-7 fill-current" strokeWidth={0} />
				</div>
				<div className="flex flex-col gap-[7px]">
					<p className="text-heading-4 font-semibold leading-heading-4 text-primary-foreground">
						{ASSESSMENT_REPORT_INTRO_SECTION.videoTitle}
					</p>
					<p className="text-regular font-normal leading-regular tracking-wide text-light-same opacity-70">
						{ASSESSMENT_REPORT_INTRO_SECTION.videoSubtitle}
					</p>
				</div>
			</div>
		</a>
	);
}
