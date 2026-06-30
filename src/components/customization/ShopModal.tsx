import { useDevelopersContext } from '@/context/DevelopersContext';
import { useCityStore } from '@/store/useCityStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShopItemCard } from '@/components/customization/ShopItemCard';

export function ShopModal() {
  const shopOpen = useCityStore((s) => s.shopOpen);
  const closeShop = useCityStore((s) => s.closeShop);
  const shopPreviewDeveloperId = useCityStore((s) => s.shopPreviewDeveloperId);
  const equipItem = useCityStore((s) => s.equipItem);
  const getEffectiveCustomization = useCityStore((s) => s.getEffectiveCustomization);
  const { getDeveloperById, shopItems, updateCustomization } = useDevelopersContext();

  const developer = shopPreviewDeveloperId
    ? getDeveloperById(shopPreviewDeveloperId)
    : null;

  const customization = developer ? getEffectiveCustomization(developer) : null;

  const isEquipped = (itemId: string) => {
    if (!customization) return false;
    switch (itemId) {
      case 'crown-gold':
      case 'crown-silver':
        return !!customization.crown;
      case 'aura-blue':
        return customization.aura === 'blue';
      case 'aura-gold':
        return customization.aura === 'gold';
      case 'aura-purple':
        return customization.aura === 'purple';
      case 'roof-antenna':
      case 'roof-flag':
      case 'roof-spire':
        return customization.roofEffect === itemId.replace('roof-', '');
      default:
        return false;
    }
  };

  const handleEquip = async (itemId: string) => {
    if (!developer) return;

    let patch: Parameters<typeof updateCustomization>[1] = {};

    switch (itemId) {
      case 'crown-gold':
      case 'crown-silver':
        patch = { crown: !isEquipped(itemId) };
        equipItem(developer.id, patch);
        break;
      case 'aura-blue':
        patch = { aura: isEquipped(itemId) ? 'none' : 'blue' };
        equipItem(developer.id, patch);
        break;
      case 'aura-gold':
        patch = { aura: isEquipped(itemId) ? 'none' : 'gold' };
        equipItem(developer.id, patch);
        break;
      case 'aura-purple':
        patch = { aura: isEquipped(itemId) ? 'none' : 'purple' };
        equipItem(developer.id, patch);
        break;
      case 'roof-antenna':
      case 'roof-flag':
      case 'roof-spire':
        patch = {
          roofEffect: isEquipped(itemId) ? undefined : itemId.replace('roof-', ''),
        };
        equipItem(developer.id, patch);
        break;
      default:
        return;
    }

    try {
      await updateCustomization(developer.id, patch);
    } catch {
      // Local equip still applies; API sync is best-effort for demo
    }
  };

  return (
    <Dialog open={shopOpen} onOpenChange={(open) => !open && closeShop()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle className="pixel-text text-neon-cyan">
            Building Customization
          </DialogTitle>
          {developer ? (
            <p className="text-sm text-muted-foreground">
              Previewing @{developer.username}&apos;s building — equip cosmetics to
              stand out in the skyline.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {/* TODO: replace with real GitHub OAuth call */}
              Sign in to claim your building and customize it.
            </p>
          )}
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {shopItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              equipped={isEquipped(item.id)}
              onEquip={() => handleEquip(item.id)}
            />
          ))}
        </div>

        {developer && customization && (
          <div className="mt-2 rounded-lg border border-white/5 bg-secondary/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Live preview</p>
            <div className="mt-3 flex items-end justify-center gap-1">
              <div
                className="relative flex flex-col items-center"
                style={{
                  filter:
                    customization.aura === 'blue'
                      ? 'drop-shadow(0 0 12px #22d3ee)'
                      : customization.aura === 'gold'
                        ? 'drop-shadow(0 0 12px #fbbf24)'
                        : customization.aura === 'purple'
                          ? 'drop-shadow(0 0 12px #e879f9)'
                          : undefined,
                }}
              >
                {customization.crown && (
                  <div className="mb-0.5 h-2 w-5 rounded-t-full border border-neon-amber bg-neon-amber/40" aria-hidden="true" />
                )}
                {customization.roofEffect && (
                  <div className="mb-0.5 h-4 w-0.5 bg-neon-cyan shadow-[0_0_6px_#22d3ee]" />
                )}
                <div
                  className="w-12 rounded-t-sm"
                  style={{
                    height: 48,
                    backgroundColor: developer.buildingColor,
                  }}
                />
                <div
                  className="w-16 rounded-sm"
                  style={{
                    height: 12,
                    backgroundColor: developer.buildingColor,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
