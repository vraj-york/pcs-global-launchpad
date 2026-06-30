import { Badge } from '@/components/ui/badge';
import { useDevelopersContext } from '@/context/DevelopersContext';
import { formatNumber } from '@/lib/utils';

export function LiveCounterBadge() {
  const { cityDevCount } = useDevelopersContext();
  return (
    <Badge variant="neon" className="hidden tabular-nums sm:inline-flex">
      {formatNumber(cityDevCount)} devs in the city
    </Badge>
  );
}
