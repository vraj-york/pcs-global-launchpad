import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchAchievementsCatalog,
  fetchCityStats,
  fetchDevelopers,
  fetchShopItems,
  patchDeveloperCustomization,
} from '@/api/devcityApi';
import { mockDevelopers, CITY_DEV_COUNT } from '@/data/mockDevelopers';
import { SHOP_ITEMS } from '@/data/mockShopItems';
import { ALL_ACHIEVEMENTS } from '@/data/mockAchievements';
import type { Achievement, Developer, DeveloperCustomization, ShopItem } from '@/types/developer';

interface DevelopersContextValue {
  developers: Developer[];
  loading: boolean;
  error: string | null;
  cityDevCount: number;
  shopItems: ShopItem[];
  achievementsCatalog: Achievement[];
  getDeveloperById: (id: string) => Developer | undefined;
  searchDevelopers: (query: string) => Developer[];
  updateCustomization: (developerId: string, customization: Partial<DeveloperCustomization>) => Promise<void>;
  getContributionRange: () => { min: number; max: number };
  getRepoCountRange: () => { min: number; max: number };
}

const DevelopersContext = createContext<DevelopersContextValue | null>(null);

export function DevelopersProvider({ children }: { children: ReactNode }) {
  const [developers, setDevelopers] = useState<Developer[]>(mockDevelopers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityDevCount, setCityDevCount] = useState(CITY_DEV_COUNT);
  const [shopItems, setShopItems] = useState<ShopItem[]>(SHOP_ITEMS);
  const [achievementsCatalog, setAchievementsCatalog] = useState<Achievement[]>(ALL_ACHIEVEMENTS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [devs, stats, items, achievements] = await Promise.all([
          fetchDevelopers(),
          fetchCityStats(),
          fetchShopItems(),
          fetchAchievementsCatalog(),
        ]);
        if (cancelled) return;
        setDevelopers(devs);
        setCityDevCount(stats.totalDevelopers);
        setShopItems(items);
        setAchievementsCatalog(achievements);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load city data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDeveloperById = useCallback(
    (id: string) => developers.find((d) => d.id === id),
    [developers],
  );

  const searchDevelopers = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return developers
        .filter(
          (d) =>
            d.username.toLowerCase().includes(q) ||
            d.displayName.toLowerCase().includes(q),
        )
        .slice(0, 8);
    },
    [developers],
  );

  const getContributionRange = useCallback(() => {
    const values = developers.map((d) => d.contributions);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [developers]);

  const getRepoCountRange = useCallback(() => {
    const values = developers.map((d) => d.repoCount);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [developers]);

  const updateCustomization = useCallback(
    async (developerId: string, customization: Partial<DeveloperCustomization>) => {
      const updated = await patchDeveloperCustomization(developerId, customization);
      setDevelopers((prev) =>
        prev.map((d) =>
          d.id === developerId ? { ...d, customization: { ...d.customization, ...updated } } : d,
        ),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      developers,
      loading,
      error,
      cityDevCount,
      shopItems,
      achievementsCatalog,
      getDeveloperById,
      searchDevelopers,
      updateCustomization,
      getContributionRange,
      getRepoCountRange,
    }),
    [
      developers,
      loading,
      error,
      cityDevCount,
      shopItems,
      achievementsCatalog,
      getDeveloperById,
      searchDevelopers,
      updateCustomization,
      getContributionRange,
      getRepoCountRange,
    ],
  );

  return (
    <DevelopersContext.Provider value={value}>{children}</DevelopersContext.Provider>
  );
}

export function useDevelopersContext(): DevelopersContextValue {
  const ctx = useContext(DevelopersContext);
  if (!ctx) {
    throw new Error('useDevelopersContext must be used within DevelopersProvider');
  }
  return ctx;
}
