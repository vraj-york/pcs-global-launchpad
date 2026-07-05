import { toast } from "sonner";
import { create } from "zustand";
import {
	cancelCoachSession,
	connectCoachIntegration,
	createCoachSession,
	disconnectCoachIntegration,
	getCoachAvailability,
	getCoachClients,
	getCoachDashboardSummary,
	getCoachEarlyAccessFeatures,
	getCoachIntegrations,
	getCoachProductUpdates,
	getCoachQuickPrep,
	getCoachResources,
	joinCoachEarlyAccessWaitlist,
	joinCoachSession,
	rescheduleCoachSession,
	updateCoachAvailability,
	type CancelCoachSessionPayload,
	type RescheduleCoachSessionPayload,
	type ScheduleCoachSessionPayload,
	type UpdateCoachAvailabilityPayload,
} from "@/api";
import type {
	CoachAvailabilityPayload,
	CoachBetaFeature,
	CoachClientOption,
	CoachClientActivity,
	CoachIntegrationStatus,
	CoachInsightStat,
	CoachLaunchUpdate,
	CoachQuickPrepData,
	CoachResource,
	CoachSession,
} from "@/types";

type CoachDashboardStore = {
	sessions: CoachSession[];
	activity: CoachClientActivity[];
	insight: CoachInsightStat[];
	availability: CoachAvailabilityPayload | null;
	clients: CoachClientOption[];
	resources: CoachResource[];
	launchUpdates: CoachLaunchUpdate[];
	earlyAccessFeatures: CoachBetaFeature[];
	integrations: CoachIntegrationStatus[];
	quickPrep: CoachQuickPrepData | null;
	loading: boolean;
	contentLoading: boolean;
	availabilitySaving: boolean;
	actionLoading: boolean;
	error: string | null;
	fetchDashboard: () => Promise<boolean>;
	fetchContent: () => Promise<boolean>;
	fetchAvailability: () => Promise<boolean>;
	fetchClients: () => Promise<boolean>;
	fetchQuickPrep: (sessionId: string) => Promise<CoachQuickPrepData | null>;
	scheduleSession: (payload: ScheduleCoachSessionPayload) => Promise<boolean>;
	rescheduleSession: (
		sessionId: string,
		payload: RescheduleCoachSessionPayload,
	) => Promise<boolean>;
	cancelSession: (
		sessionId: string,
		payload: CancelCoachSessionPayload,
	) => Promise<boolean>;
	joinSession: (sessionId: string) => Promise<string | null>;
	saveAvailability: (payload: UpdateCoachAvailabilityPayload) => Promise<boolean>;
	requestEarlyAccess: (featureKey?: string) => Promise<boolean>;
	connectIntegration: (provider: string) => Promise<boolean>;
	disconnectIntegration: (provider: string) => Promise<boolean>;
	reset: () => void;
};

const initialState = {
	sessions: [] as CoachSession[],
	activity: [] as CoachClientActivity[],
	insight: [] as CoachInsightStat[],
	availability: null as CoachAvailabilityPayload | null,
	clients: [] as CoachClientOption[],
	resources: [] as CoachResource[],
	launchUpdates: [] as CoachLaunchUpdate[],
	earlyAccessFeatures: [] as CoachBetaFeature[],
	integrations: [] as CoachIntegrationStatus[],
	quickPrep: null as CoachQuickPrepData | null,
	loading: false,
	contentLoading: false,
	availabilitySaving: false,
	actionLoading: false,
	error: null as string | null,
};

export const useCoachDashboardStore = create<CoachDashboardStore>()((set, get) => ({
	...initialState,

	fetchDashboard: async () => {
		set({ loading: true, error: null });
		const result = await getCoachDashboardSummary();
		if (!result.ok) {
			set({ loading: false, error: result.message });
			return false;
		}
		set({
			sessions: result.data.sessions,
			activity: result.data.activity,
			insight: result.data.insight,
			availability: result.data.availability,
			loading: false,
			error: null,
		});
		await get().fetchClients();
		return true;
	},

	fetchContent: async () => {
		set({ contentLoading: true });
		try {
			const [resources, updates, features, integrations] = await Promise.all([
				getCoachResources(),
				getCoachProductUpdates(),
				getCoachEarlyAccessFeatures(),
				getCoachIntegrations(),
			]);
			if (resources.ok) set({ resources: resources.data });
			if (updates.ok) set({ launchUpdates: updates.data });
			if (features.ok) set({ earlyAccessFeatures: features.data });
			if (integrations.ok) set({ integrations: integrations.data });
			const errors = [resources, updates, features, integrations].filter(
				(result) => !result.ok,
			);
			if (errors.length > 0) {
				const first = errors[0];
				if (!first.ok) toast.error(first.message);
				return false;
			}
			return true;
		} finally {
			set({ contentLoading: false });
		}
	},

	fetchAvailability: async () => {
		const result = await getCoachAvailability();
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		set({ availability: result.data });
		return true;
	},

	fetchClients: async () => {
		const result = await getCoachClients();
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		set({ clients: result.data });
		return true;
	},

	fetchQuickPrep: async (sessionId: string) => {
		const result = await getCoachQuickPrep(sessionId);
		if (!result.ok) {
			toast.error(result.message);
			return null;
		}
		set({ quickPrep: result.data });
		return result.data;
	},

	scheduleSession: async (payload) => {
		set({ actionLoading: true });
		try {
			const result = await createCoachSession(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success("Session scheduled successfully.");
			await Promise.all([
				get().fetchDashboard(),
				get().fetchAvailability(),
				get().fetchClients(),
			]);
			return true;
		} finally {
			set({ actionLoading: false });
		}
	},

	rescheduleSession: async (sessionId, payload) => {
		set({ actionLoading: true });
		try {
			const result = await rescheduleCoachSession(sessionId, payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success("Session rescheduled successfully.");
			await Promise.all([get().fetchDashboard(), get().fetchAvailability()]);
			return true;
		} finally {
			set({ actionLoading: false });
		}
	},

	cancelSession: async (sessionId, payload) => {
		set({ actionLoading: true });
		try {
			const result = await cancelCoachSession(sessionId, payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success("Session cancelled successfully.");
			await get().fetchDashboard();
			return true;
		} finally {
			set({ actionLoading: false });
		}
	},

	joinSession: async (sessionId) => {
		const result = await joinCoachSession(sessionId);
		if (!result.ok) {
			toast.error(result.message);
			return null;
		}
		return result.data.meetingUrl;
	},

	saveAvailability: async (payload) => {
		set({ availabilitySaving: true });
		try {
			const result = await updateCoachAvailability(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			set({ availability: result.data });
			toast.success("Availability updated successfully.");
			return true;
		} finally {
			set({ availabilitySaving: false });
		}
	},

	requestEarlyAccess: async (featureKey) => {
		const result = await joinCoachEarlyAccessWaitlist(featureKey);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Early access request submitted.");
		return true;
	},

	connectIntegration: async (provider) => {
		const result = await connectCoachIntegration(provider);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success(result.data.message);
		await get().fetchContent();
		return true;
	},

	disconnectIntegration: async (provider) => {
		const result = await disconnectCoachIntegration(provider);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Calendar integration updated.");
		await get().fetchContent();
		return true;
	},

	reset: () => set(initialState),
}));
