import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { patchUserOnboardingSteps } from "@/api";
import { Button } from "@/components/ui/button";
import {
	END_USER_FTUE_INTRO,
	END_USER_ONBOARDING_YOUTUBE_EMBED_SRC,
	ROUTES,
} from "@/const";
import { useUsersStore } from "@/store";

export function EndUserOnboardingIntroContent() {
	const navigate = useNavigate();
	const { fetchUserProfile } = useUsersStore();
	const intro = END_USER_FTUE_INTRO;
	const [pending, setPending] = useState(false);

	const handleStartAssessment = async () => {
		setPending(true);
		try {
			const res = await patchUserOnboardingSteps({ type: "intro_video" });
			if (!res.ok) {
				toast.error(res.message);
				return;
			}
			await fetchUserProfile();
			navigate(ROUTES.assessment.introEntry, { replace: true });
		} finally {
			setPending(false);
		}
	};

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex max-w-4xl flex-col items-center gap-6 text-center">
				<h1 className="text-balance whitespace-pre-line text-heading-1 font-semibold leading-heading-1 tracking-heading-1 text-brand-primary">
					{intro.title}
				</h1>
				<p className="max-w-4xl text-heading-4 font-semibold leading-heading-4 text-text-foreground">
					{intro.subtitle}
				</p>
			</div>

			<div className="flex w-full max-w-4xl flex-col gap-10 rounded-[32px] shadow-2xl">
				<div className="aspect-video w-full overflow-hidden rounded-2xl shadow-inner">
					<iframe
						src={END_USER_ONBOARDING_YOUTUBE_EMBED_SRC}
						title={intro.videoCaptionTitle}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						className="size-full border-0"
					/>
				</div>
			</div>

			<Button
				type="button"
				size="lg"
				icon={ArrowRight}
				iconPosition="end"
				isLoading={pending}
				onClick={handleStartAssessment}
			>
				{pending ? intro.startAssessmentSubmitting : intro.startAssessmentCta}
			</Button>
		</div>
	);
}
