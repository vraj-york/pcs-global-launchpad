import { create } from 'zustand';
import type { CameraMode, Developer, DeveloperCustomization } from '@/types/developer';

interface FlyTarget {
  x: number;
  y: number;
  z: number;
}

interface CityState {
  selectedDeveloperId: string | null;
  cameraMode: CameraMode;
  searchQuery: string;
  hoveredDeveloperId: string | null;
  hudDismissed: boolean;
  shopOpen: boolean;
  shopPreviewDeveloperId: string | null;
  equippedItems: Record<string, DeveloperCustomization>;
  flyTarget: FlyTarget | null;
  defaultCameraPosition: FlyTarget;

  setSelectedDeveloper: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSearchQuery: (query: string) => void;
  setHoveredDeveloper: (id: string | null) => void;
  dismissHud: () => void;
  openShop: (developerId?: string) => void;
  closeShop: () => void;
  equipItem: (developerId: string, customization: Partial<DeveloperCustomization>) => void;
  flyToDeveloper: (developer: Developer) => void;
  clearFlyTarget: () => void;
  getEffectiveCustomization: (developer: Developer) => DeveloperCustomization;
}

export const useCityStore = create<CityState>((set, get) => ({
  selectedDeveloperId: null,
  cameraMode: 'orbit',
  searchQuery: '',
  hoveredDeveloperId: null,
  hudDismissed: false,
  shopOpen: false,
  shopPreviewDeveloperId: null,
  equippedItems: {},
  flyTarget: null,
  defaultCameraPosition: { x: 18, y: 14, z: 18 },

  setSelectedDeveloper: (id) => set({ selectedDeveloperId: id }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHoveredDeveloper: (id) => set({ hoveredDeveloperId: id }),
  dismissHud: () => set({ hudDismissed: true }),
  openShop: (developerId) =>
    set({
      shopOpen: true,
      shopPreviewDeveloperId: developerId ?? get().selectedDeveloperId,
    }),
  closeShop: () => set({ shopOpen: false }),

  equipItem: (developerId, customization) =>
    set((state) => ({
      equippedItems: {
        ...state.equippedItems,
        [developerId]: {
          ...state.equippedItems[developerId],
          ...customization,
        },
      },
    })),

  flyToDeveloper: (developer) => {
    const [x, z] = developer.buildingPosition;
    set({
      flyTarget: { x: x * 3, y: 4, z: z * 3 + 6 },
      selectedDeveloperId: developer.id,
    });
  },

  clearFlyTarget: () => set({ flyTarget: null }),

  getEffectiveCustomization: (developer) => ({
    crown: false,
    aura: 'none',
    ...developer.customization,
    ...get().equippedItems[developer.id],
  }),
}));
