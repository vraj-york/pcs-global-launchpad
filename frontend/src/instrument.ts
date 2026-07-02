import * as Sentry from "@sentry/react";
import { reactRouterV6BrowserTracingIntegration } from "@sentry/react";
import React from "react";
import {
	createRoutesFromChildren,
	matchRoutes,
	useLocation,
	useNavigationType,
} from "react-router-dom";
import { isDemoMode } from "@/demo";

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (dsn && !isDemoMode) {
	Sentry.init({
		dsn,
		environment:
			import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
		release: import.meta.env.VITE_SENTRY_RELEASE,
		sendDefaultPii: true,
		integrations: [
			reactRouterV6BrowserTracingIntegration({
				useEffect: React.useEffect,
				useLocation,
				useNavigationType,
				createRoutesFromChildren,
				matchRoutes,
			}),
			Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
			Sentry.captureConsoleIntegration({
				levels: ["error"],
			}),
		],
		tracesSampleRate: 1.0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		tracePropagationTargets: ["localhost", /^https:\/\/.*\.bspblueprint\.com/],
		enableLogs: true,
	});
}
