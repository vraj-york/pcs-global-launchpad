import { CircleCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PASSWORD_RESET_SUCCESS_PAGE_CONTENT, ROUTES } from "@/const";

export function PasswordResetSuccessView() {
	const navigate = useNavigate();

	const handleLoginAgain = () => {
		navigate(ROUTES.auth.login);
	};

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col items-center gap-10">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-success p-2"
					aria-hidden
				>
					<CircleCheck className="size-12 text-light-same" strokeWidth={2} />
				</div>
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-3 font-semibold leading-heading-3 tracking-heading-2 text-text-foreground">
						{PASSWORD_RESET_SUCCESS_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular text-text-secondary">
						{PASSWORD_RESET_SUCCESS_PAGE_CONTENT.subtitle}
					</CardDescription>
				</div>
				<Button
					type="button"
					onClick={handleLoginAgain}
					size="lg"
					className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same"
				>
					{PASSWORD_RESET_SUCCESS_PAGE_CONTENT.ctaButton}
				</Button>
			</div>
		</Card>
	);
}
