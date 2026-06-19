/*
 * SEMANTIC ANALYSIS
 * Route: / (single-page city view)
 * - Full-viewport 3D canvas → React Three Fiber CityScene
 * - Floating navbar → search (filters mock devs, flies camera), live counter, Discord, CTA
 * - Bottom-left HUD → dismissible controls legend
 * - Bottom-right → Orbit/Fly camera toggle
 * - Click building → ProfilePanel (Sheet from right)
 * - Claim Your Building / Customize → ShopModal
 * - Hover building → floating username label
 */
import { TooltipProvider } from '@/components/ui/tooltip';
import { CityScene } from '@/components/city/CityScene';
import { ShopModal } from '@/components/customization/ShopModal';
import { ProfilePanel } from '@/components/profile/ProfilePanel';
import { CameraModeToggle, HoverLabel } from '@/components/ui-overlay/CameraModeToggle';
import { ControlsHUD } from '@/components/ui-overlay/ControlsHUD';
import { Navbar } from '@/components/ui-overlay/Navbar';
import { mockDevelopers } from '@/data/mockDevelopers';
import { useCityStore } from '@/store/useCityStore';

function HoverLabelOverlay() {
  const hoveredId = useCityStore((s) => s.hoveredDeveloperId);
  const selectedId = useCityStore((s) => s.selectedDeveloperId);

  const activeId = hoveredId && hoveredId !== selectedId ? hoveredId : null;
  if (!activeId) return null;

  const dev = mockDevelopers.find((d) => d.id === activeId);
  if (!dev) return null;

  return <HoverLabel username={dev.username} />;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-screen w-screen overflow-hidden bg-[#0a0e1a]">
        <div className="absolute inset-0">
          <CityScene />
        </div>

        <Navbar />
        <ControlsHUD />
        <CameraModeToggle />
        <HoverLabelOverlay />
        <ProfilePanel />
        <ShopModal />
      </div>
    </TooltipProvider>
  );
}
