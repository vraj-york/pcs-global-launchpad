import { apiFetch } from './client';
import type { Achievement, Developer, DeveloperCustomization, ShopItem } from '@/types/developer';

export async function fetchDevelopers(search?: string, limit?: number): Promise<Developer[]> {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiFetch<Developer[]>(`/api/v1/developers${qs ? `?${qs}` : ''}`);
}

export async function fetchDeveloperById(id: string): Promise<Developer> {
  return apiFetch<Developer>(`/api/v1/developers/${id}`);
}

export async function fetchCityStats(): Promise<{ totalDevelopers: number }> {
  return apiFetch<{ totalDevelopers: number }>('/api/v1/city/stats');
}

export async function fetchShopItems(): Promise<ShopItem[]> {
  return apiFetch<ShopItem[]>('/api/v1/shop-items');
}

export async function fetchAchievementsCatalog(): Promise<Achievement[]> {
  return apiFetch<Achievement[]>('/api/v1/achievements');
}

export async function patchDeveloperCustomization(
  developerId: string,
  customization: Partial<DeveloperCustomization>,
): Promise<DeveloperCustomization> {
  return apiFetch<DeveloperCustomization>(
    `/api/v1/developers/${developerId}/customizations`,
    { method: 'PATCH', body: JSON.stringify(customization) },
  );
}
