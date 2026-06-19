import { Badge } from '@/components/ui/badge';
import { CITY_DEV_COUNT } from '@/data/mockDevelopers';
import { formatNumber } from '@/lib/utils';

export function LiveCounterBadge() {
  return (
    <Badge variant="neon" className="hidden tabular-nums sm:inline-flex">
      {formatNumber(CITY_DEV_COUNT)} devs in the city
    </Badge>
  );
}
