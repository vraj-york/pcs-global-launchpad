import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCityStore } from '@/store/useCityStore';

export function ControlsHUD() {
  const hudDismissed = useCityStore((s) => s.hudDismissed);
  const dismissHud = useCityStore((s) => s.dismissHud);

  if (hudDismissed) return null;

  return (
    <Card className="pointer-events-auto fixed bottom-4 left-4 z-30 hidden w-72 border-white/10 bg-card/80 backdrop-blur-xl sm:block">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="pixel-text text-xs text-neon-cyan">Controls</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={dismissHud}
          aria-label="Dismiss controls"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p>
          <kbd className="rounded bg-secondary px-1.5 py-0.5 font-sans text-foreground">Drag</kbd>{' '}
          to orbit the skyline
        </p>
        <p>
          <kbd className="rounded bg-secondary px-1.5 py-0.5 font-sans text-foreground">Scroll</kbd>{' '}
          to zoom in and out
        </p>
        <p>
          <kbd className="rounded bg-secondary px-1.5 py-0.5 font-sans text-foreground">Click</kbd>{' '}
          a building to view profile
        </p>
        <p className="pt-1 text-[11px] text-muted-foreground/80">
          Switch to Fly mode for free-roam exploration
        </p>
      </CardContent>
    </Card>
  );
}
