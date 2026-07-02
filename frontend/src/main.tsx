import { resolveLaunchpadRouterBasename } from "./launchpadEmbedBasename.js";
import "./instrument";
import { reactErrorHandler } from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { configureAmplify, getRememberMePreference } from "@/config";
import { isDemoMode } from "@/demo";
import { initPosthog } from "@/lib";
import "./index.css";
import App from "./App.tsx";

if (!isDemoMode) {
	configureAmplify(getRememberMePreference());
	initPosthog();
}

createRoot(document.getElementById("root")!, {
	onUncaughtError: reactErrorHandler(),
	onCaughtError: reactErrorHandler(),
	onRecoverableError: reactErrorHandler(),
}).render(
	<StrictMode>
		<BrowserRouter basename={resolveLaunchpadRouterBasename()}>
			<App />
			<Toaster position="top-center" richColors />
		</BrowserRouter>
	</StrictMode>,
);
