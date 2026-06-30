import { useMemo } from 'react';
import {
  normalizeContributions,
  normalizeRepoCount,
} from '@/data/mockDevelopers';
import { useDevelopersContext } from '@/context/DevelopersContext';
import { useCityStore } from '@/store/useCityStore';
import { GRID_SCALE } from '@/components/city/BuildingInstances';

const AURA_COLORS = {
  blue: '#22d3ee',
  gold: '#fbbf24',
  purple: '#e879f9',
} as const;

export function BuildingCustomization() {
  const equippedItems = useCityStore((s) => s.equippedItems);
  const getEffectiveCustomization = useCityStore((s) => s.getEffectiveCustomization);
  const { developers, getContributionRange, getRepoCountRange } = useDevelopersContext();

  const customized = useMemo(() => {
    const contribRange = getContributionRange();
    const repoRange = getRepoCountRange();

    return developers
      .map((dev) => {
        const customization = getEffectiveCustomization(dev);
        const hasVisual =
          customization.crown ||
          (customization.aura && customization.aura !== 'none') ||
          customization.roofEffect;

        if (!hasVisual) return null;

        const height = normalizeContributions(
          dev.contributions,
          contribRange.min,
          contribRange.max
        );
        const width = normalizeRepoCount(dev.repoCount, repoRange.min, repoRange.max);

        return {
          id: dev.id,
          customization,
          height,
          width,
          x: dev.buildingPosition[0] * GRID_SCALE,
          z: dev.buildingPosition[1] * GRID_SCALE,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      customization: ReturnType<typeof getEffectiveCustomization>;
      height: number;
      width: number;
      x: number;
      z: number;
    }>;
  }, [developers, equippedItems, getEffectiveCustomization, getContributionRange, getRepoCountRange]);

  return (
    <group>
      {customized.map(({ id, customization, height, width, x, z }) => (
        <group key={id}>
          {customization.crown && (
            <mesh position={[x, height + 0.35, z]}>
              <boxGeometry args={[width * 0.5, 0.2, width * 0.5]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
            </mesh>
          )}
          {customization.aura && customization.aura !== 'none' && (
            <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[width * 0.6, width * 1.1, 32]} />
              <meshBasicMaterial
                color={AURA_COLORS[customization.aura]}
                transparent
                opacity={0.35}
              />
            </mesh>
          )}
          {customization.roofEffect && (
            <mesh position={[x, height + 0.5, z]}>
              <boxGeometry args={[0.08, 0.8, 0.08]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
