import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchDevelopers } from '@/data/mockDevelopers';
import { useCityStore } from '@/store/useCityStore';
import type { Developer } from '@/types/developer';
import { cn } from '@/lib/utils';

export function SearchBar() {
  const searchQuery = useCityStore((s) => s.searchQuery);
  const setSearchQuery = useCityStore((s) => s.setSearchQuery);
  const flyToDeveloper = useCityStore((s) => s.flyToDeveloper);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = searchQuery.length >= 1 ? searchDevelopers(searchQuery) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (dev: Developer) => {
    flyToDeveloper(dev);
    setSearchQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Find a developer..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-10 border-white/10 bg-background/60 pl-9 pr-9 backdrop-blur-md"
          aria-label="Search developers"
          aria-expanded={open && results.length > 0}
          aria-haspopup="listbox"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-card/95 py-1 shadow-xl backdrop-blur-xl"
        >
          {results.map((dev) => (
            <li key={dev.id} role="option">
              <button
                type="button"
                onClick={() => handleSelect(dev)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary/80 focus-visible:bg-secondary/80 focus-visible:outline-none'
                )}
              >
                <img
                  src={dev.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{dev.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{dev.username}</p>
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {dev.contributions.toLocaleString()} commits
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && searchQuery.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-white/10 bg-card/95 p-4 text-center text-sm text-muted-foreground backdrop-blur-xl">
          No buildings found for &ldquo;{searchQuery}&rdquo;
        </div>
      )}
    </div>
  );
}
