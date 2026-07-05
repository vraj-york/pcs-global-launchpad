import { create } from "zustand";
import { persist } from "zustand/middleware";

type CoachSidebarPreviewStore = {
	coachSidebarPreview: boolean;
	setCoachSidebarPreview: (enabled: boolean) => void;
	toggleCoachSidebarPreview: () => void;
};

export const useCoachSidebarPreviewStore = create<CoachSidebarPreviewStore>()(
	persist(
		(set, get) => ({
			coachSidebarPreview: false,
			setCoachSidebarPreview: (enabled) =>
				set({ coachSidebarPreview: enabled }),
			toggleCoachSidebarPreview: () =>
				set({ coachSidebarPreview: !get().coachSidebarPreview }),
		}),
		{
			name: "bsp-coach-sidebar-preview",
		},
	),
);
