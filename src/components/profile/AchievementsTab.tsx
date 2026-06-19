import { ALL_ACHIEVEMENTS } from '@/data/mockAchievements';
import type { Achievement } from '@/types/developer';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AchievementsTabProps {
  unlocked: Achievement[];
}

export function AchievementsTab({ unlocked }: AchievementsTabProps) {
  const unlockedIds = new Set(unlocked.map((a) => a.id));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ALL_ACHIEVEMENTS.map((achievement) => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const unlockData = unlocked.find((a) => a.id === achievement.id);

        return (
          <div
            key={achievement.id}
            className={cn(
              'flex flex-col items-center rounded-lg border p-3 text-center transition-colors',
              isUnlocked
                ? 'border-neon-cyan/20 bg-secondary/40'
                : 'border-white/5 bg-secondary/10 opacity-40 grayscale'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border text-[10px] font-bold tracking-wider',
                isUnlocked
                  ? 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan'
                  : 'border-white/10 bg-secondary/20 text-muted-foreground'
              )}
              aria-hidden="true"
            >
              {achievement.icon}
            </span>
            <p className="mt-2 text-xs font-medium leading-tight">{achievement.name}</p>
            {isUnlocked && unlockData?.unlockedAt && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDate(unlockData.unlockedAt)}
              </p>
            )}
            {!isUnlocked && (
              <p className="mt-1 text-[10px] text-muted-foreground">Locked</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
