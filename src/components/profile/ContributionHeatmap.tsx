import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const INTENSITY_CLASSES = [
  'bg-secondary/30',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-neon-cyan/70',
];

interface ContributionHeatmapProps {
  seed?: string;
}

function hashSeed(seed: string, index: number): number {
  let h = 0;
  const str = `${seed}-${index}`;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function ContributionHeatmap({ seed = 'default' }: ContributionHeatmapProps) {
  const cells = useMemo(() => {
    return Array.from({ length: 7 * 52 }, (_, i) => {
      const intensity = hashSeed(seed, i) % 5;
      return intensity;
    });
  }, [seed]);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-[3px]"
        style={{ gridTemplateColumns: 'repeat(52, minmax(0, 1fr))' }}
        role="img"
        aria-label="Contribution activity heatmap"
      >
        {cells.map((intensity, i) => (
          <div
            key={i}
            className={cn('h-2.5 w-2.5 rounded-[2px]', INTENSITY_CLASSES[intensity])}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Contribution activity over the past year
      </p>
    </div>
  );
}
