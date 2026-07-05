import { toast } from "sonner";
import { create } from "zustand";
import {
	acceptCoachSessionRequest,
	cancelCoachSessionRequest,
	declineCoachSessionRequest,
	editCoachSessionSlots,
	getCoachSessionDetail,
	getCoachSessionNotes,
	getCoachSessionRequestReason,
	getCoachSessionRequests,
	getCoachSessions,
	proposeCoachSessionSlots,
	remindCoachSessionRequest,
	updateCoachSessionNotes,
} from "@/api";
import type { CoachScheduledSession, CoachSessionRequest } from "@/types";
import { useCoachDashboardStore } from "./coach-dashboard.store";

type CoachSessionsStore = {
	upcomingSessions: CoachScheduledSession[];
	pastSessions: CoachScheduledSession[];
	sessionRequests: CoachSessionRequest[];
	selectedSessionId: string | null;
	selectedSession: CoachScheduledSession | null;
	selectedNotes: string;
	loading: boolean;
	requestsLoading: boolean;
	notesSaving: boolean;
	error: string | null;
	fetchSessionsPage: () => Promise<boolean>;
	fetchSessionRequests: (filters?: {
		status?: string;
		employeeId?: string;
	}) => Promise<boolean>;
	selectSession: (sessionId: string | null) => Promise<void>;
	saveNotes: (sessionId: string, notes: string) => Promise<boolean>;
	acceptRequest: (requestId: string) => Promise<boolean>;
	declineRequest: (requestId: string, reason?: string) => Promise<boolean>;
	proposeSlots: (requestId: string, proposedSlots: string[]) => Promise<boolean>;
	editSlots: (requestId: string, proposedSlots: string[]) => Promise<boolean>;
	remindRequest: (requestId: string) => Promise<boolean>;
	cancelRequest: (requestId: string, reason?: string) => Promise<boolean>;
	fetchRequestReason: (requestId: string) => Promise<string | null>;
	reset: () => void;
};

const initialState = {
	upcomingSessions: [] as CoachScheduledSession[],
	pastSessions: [] as CoachScheduledSession[],
	sessionRequests: [] as CoachSessionRequest[],
	selectedSessionId: null as string | null,
	selectedSession: null as CoachScheduledSession | null,
	selectedNotes: "",
	loading: false,
	requestsLoading: false,
	notesSaving: false,
	error: null as string | null,
};

export const useCoachSessionsStore = create<CoachSessionsStore>()((set, get) => ({
	...initialState,

	fetchSessionsPage: async () => {
		set({ loading: true, error: null });
		const [upcoming, past] = await Promise.all([
			getCoachSessions("upcoming"),
			getCoachSessions("past"),
		]);
		if (upcoming.ok && past.ok) {
			set({
				upcomingSessions: upcoming.data,
				pastSessions: past.data,
				loading: false,
				error: null,
			});
			return true;
		}
		let message = "Failed to load sessions";
		if (!upcoming.ok) {
			message = upcoming.message;
		} else if (!past.ok) {
			message = past.message;
		}
		set({ loading: false, error: message });
		toast.error(message);
		return false;
	},

	fetchSessionRequests: async (filters) => {
		set({ requestsLoading: true });
		try {
			const result = await getCoachSessionRequests(filters);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			set({ sessionRequests: result.data });
			return true;
		} finally {
			set({ requestsLoading: false });
		}
	},

	selectSession: async (sessionId) => {
		if (!sessionId) {
			set({
				selectedSessionId: null,
				selectedSession: null,
				selectedNotes: "",
			});
			return;
		}
		const detail = await getCoachSessionDetail(sessionId);
		if (!detail.ok) {
			toast.error(detail.message);
			return;
		}
		const notes = await getCoachSessionNotes(sessionId);
		set({
			selectedSessionId: sessionId,
			selectedSession: detail.data,
			selectedNotes: notes.ok ? notes.data.notes : detail.data.notes ?? "",
		});
	},

	saveNotes: async (sessionId, notes) => {
		set({ notesSaving: true });
		try {
			const result = await updateCoachSessionNotes(sessionId, notes);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success("Session notes updated successfully.");
			await get().selectSession(sessionId);
			await get().fetchSessionsPage();
			return true;
		} finally {
			set({ notesSaving: false });
		}
	},

	acceptRequest: async (requestId) => {
		const result = await acceptCoachSessionRequest(requestId);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Session request accepted.");
		await Promise.all([
			get().fetchSessionRequests(),
			get().fetchSessionsPage(),
			useCoachDashboardStore.getState().fetchDashboard(),
		]);
		return true;
	},

	declineRequest: async (requestId, reason) => {
		const result = await declineCoachSessionRequest(requestId, reason);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Session request declined.");
		await get().fetchSessionRequests();
		return true;
	},

	proposeSlots: async (requestId, proposedSlots) => {
		const result = await proposeCoachSessionSlots(requestId, proposedSlots);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("New time slots proposed.");
		await get().fetchSessionRequests();
		return true;
	},

	editSlots: async (requestId, proposedSlots) => {
		const result = await editCoachSessionSlots(requestId, proposedSlots);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Proposed slots updated.");
		await get().fetchSessionRequests();
		return true;
	},

	remindRequest: async (requestId) => {
		const result = await remindCoachSessionRequest(requestId);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Reminder sent successfully.");
		return true;
	},

	cancelRequest: async (requestId, reason) => {
		const result = await cancelCoachSessionRequest(requestId, reason);
		if (!result.ok) {
			toast.error(result.message);
			return false;
		}
		toast.success("Session request cancelled.");
		await get().fetchSessionRequests();
		return true;
	},

	fetchRequestReason: async (requestId) => {
		const result = await getCoachSessionRequestReason(requestId);
		if (!result.ok) {
			toast.error(result.message);
			return null;
		}
		return result.data.reason;
	},

	reset: () => set(initialState),
}));
