import flyIcon from '@/assets/icons/fly-mode.svg';
import orbitIcon from '@/assets/icons/orbit-mode.svg';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCityStore } from '@/store/useCityStore';
import type { CameraMode } from '@/types/developer';
import { cn } from '@/lib/utils';

export function CameraModeToggle() {
  const cameraMode = useCityStore((s) => s.cameraMode);
  const setCameraMode = useCityStore((s) => s.setCameraMode);

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30">
      <ToggleGroup
        type="single"
        value={cameraMode}
        onValueChange={(v) => {
          if (v) setCameraMode(v as CameraMode);
        }}
        className="glass-panel rounded-lg p-1"
        aria-label="Camera mode"
      >
        <ToggleGroupItem value="orbit" aria-label="Orbit mode" className="gap-1.5 px-3">
          <img src={orbitIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Orbit</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="fly" aria-label="Fly mode" className="gap-1.5 px-3">
          <img src={flyIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Fly</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function HoverLabel({ username }: { username: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 top-24 z-30 -translate-x-1/2',
        'rounded-md border border-neon-cyan/30 bg-card/90 px-3 py-1.5',
        'pixel-text text-xs text-neon-cyan shadow-lg backdrop-blur-md'
      )}
    >
      @{username}
    </div>
  );
}
