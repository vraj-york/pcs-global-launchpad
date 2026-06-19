import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface StatItem {
  label: string;
  value: number;
}

interface ProfileStatsCardsProps {
  contributions: number;
  repoCount: number;
  starCount: number;
  followers: number;
}

export function ProfileStatsCards({
  contributions,
  repoCount,
  starCount,
  followers,
}: ProfileStatsCardsProps) {
  const stats: StatItem[] = [
    { label: 'Contributions', value: contributions },
    { label: 'Repos', value: repoCount },
    { label: 'Stars', value: starCount },
    { label: 'Followers', value: followers },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-white/5 bg-secondary/30">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatNumber(stat.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
