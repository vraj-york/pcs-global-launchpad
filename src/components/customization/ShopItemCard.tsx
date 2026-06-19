import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ShopItem } from '@/types/developer';
import { cn } from '@/lib/utils';

interface ShopItemCardProps {
  item: ShopItem;
  equipped: boolean;
  onEquip: () => void;
}

export function ShopItemCard({ item, equipped, onEquip }: ShopItemCardProps) {
  return (
    <Card
      className={cn(
        'border-white/5 transition-colors',
        equipped && 'border-neon-cyan/40 bg-neon-cyan/5'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{item.name}</CardTitle>
          <span className="shrink-0 text-xs font-medium text-neon-amber">{item.price}</span>
        </div>
        <CardDescription className="text-xs">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.previewColor && (
          <div
            className="h-8 w-full rounded-md border border-white/10"
            style={{
              background: `radial-gradient(circle at center, ${item.previewColor}40, transparent 70%)`,
            }}
          />
        )}
        {item.category === 'crown' && (
          <div className="flex justify-center py-2" aria-hidden="true">
            <div className="h-3 w-6 rounded-t-full border-2 border-neon-amber bg-neon-amber/30" />
          </div>
        )}
        {item.category === 'roof' && (
          <div className="flex justify-center py-2">
            <div className="h-6 w-1 bg-neon-cyan shadow-[0_0_8px_#22d3ee]" />
          </div>
        )}
        <Button
          size="sm"
          variant={equipped ? 'secondary' : 'default'}
          className="w-full"
          onClick={onEquip}
        >
          {equipped ? 'Equipped' : 'Equip'}
        </Button>
      </CardContent>
    </Card>
  );
}
