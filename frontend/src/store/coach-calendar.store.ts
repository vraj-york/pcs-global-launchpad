import { toast } from "sonner";
import { create } from "zustand";
import { getCoachCalendar } from "@/api";
import type {
	CoachCalendarEvent,
	CoachCalendarMonthDay,
	CoachCalendarResponse,
	CoachCalendarDay,
} from "@/types";

type CoachCalendarStore = {
	view: "week" | "month";
	weekDays: CoachCalendarDay[];
	weekEvents: CoachCalendarEvent[];
	monthLabel: string;
	monthWeeks: CoachCalendarMonthDay[][];
	selectedDate: number | null;
	loading: boolean;
	error: string | null;
	fetchCalendar: (view: "week" | "month", start: string) => Promise<boolean>;
	setSelectedDate: (date: number | null) => void;
	reset: () => void;
};

const initialState = {
	view: "week" as const,
	weekDays: [] as CoachCalendarDay[],
	weekEvents: [] as CoachCalendarEvent[],
	monthLabel: "",
	monthWeeks: [] as CoachCalendarMonthDay[][],
	selectedDate: null as number | null,
	loading: false,
	error: null as string | null,
};

function applyCalendarData(
	set: (partial: Partial<CoachCalendarStore>) => void,
	view: "week" | "month",
	data: CoachCalendarResponse,
) {
	if (data.view === "week") {
		set({
			view,
			weekDays: data.days,
			weekEvents: data.events,
			monthLabel: "",
			monthWeeks: [],
			selectedDate: null,
			loading: false,
			error: null,
		});
		return;
	}
	set({
		view,
		weekDays: [],
		weekEvents: [],
		monthLabel: data.monthLabel,
		monthWeeks: data.weeks,
		selectedDate: data.selectedDate,
		loading: false,
		error: null,
	});
}

export const useCoachCalendarStore = create<CoachCalendarStore>()((set) => ({
	...initialState,

	fetchCalendar: async (view, start) => {
		set({ loading: true, error: null });
		const result = await getCoachCalendar(view, start);
		if (!result.ok) {
			set({ loading: false, error: result.message });
			toast.error(result.message);
			return false;
		}
		applyCalendarData(set, view, result.data);
		return true;
	},

	setSelectedDate: (date) => set({ selectedDate: date }),

	reset: () => set(initialState),
}));
