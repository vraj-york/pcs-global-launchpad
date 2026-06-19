import discordIcon from '@/assets/icons/discord.svg';
import { LogoMark } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { LiveCounterBadge } from '@/components/ui-overlay/LiveCounterBadge';
import { SearchBar } from '@/components/ui-overlay/SearchBar';
import { useCityStore } from '@/store/useCityStore';

export function Navbar() {
  const openShop = useCityStore((s) => s.openShop);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <nav
        className="pointer-events-auto flex w-full max-w-6xl items-center gap-3 rounded-xl border border-white/10 bg-card/60 px-4 py-2.5 shadow-2xl backdrop-blur-xl sm:gap-4 sm:px-5"
        aria-label="Main navigation"
      >
        <div className="flex shrink-0 items-center gap-2.5">
          <LogoMark />
          <span className="pixel-text hidden text-sm text-neon-cyan sm:inline sm:text-base">
            DevCity
          </span>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LiveCounterBadge />
          <Button
            variant="ghost"
            size="icon"
            className="hidden border border-white/5 sm:inline-flex"
            aria-label="Join Discord community"
            onClick={() => {
              // TODO: wire to Discord invite URL
            }}
          >
            <img src={discordIcon} alt="" aria-hidden="true" className="h-5 w-5 opacity-80" />
          </Button>
          <Button
            size="sm"
            className="pixel-text text-xs sm:text-sm"
            onClick={() => openShop()}
          >
            Claim Your Building
          </Button>
        </div>
      </nav>

      <div className="pointer-events-auto fixed bottom-20 left-4 right-4 z-40 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
