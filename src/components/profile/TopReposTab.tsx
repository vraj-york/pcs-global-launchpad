import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TopRepo } from '@/types/developer';
import { formatNumber } from '@/lib/utils';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500/20 text-blue-300',
  JavaScript: 'bg-yellow-500/20 text-yellow-300',
  Rust: 'bg-orange-500/20 text-orange-300',
  Python: 'bg-emerald-500/20 text-emerald-300',
  Go: 'bg-cyan-500/20 text-cyan-300',
  'C++': 'bg-pink-500/20 text-pink-300',
  C: 'bg-gray-500/20 text-gray-300',
  Java: 'bg-red-500/20 text-red-300',
  Kotlin: 'bg-purple-500/20 text-purple-300',
  Swift: 'bg-orange-400/20 text-orange-200',
  SQL: 'bg-teal-500/20 text-teal-300',
  HCL: 'bg-indigo-500/20 text-indigo-300',
  Shell: 'bg-green-500/20 text-green-300',
  Markdown: 'bg-slate-500/20 text-slate-300',
  Solidity: 'bg-violet-500/20 text-violet-300',
  CSS: 'bg-sky-500/20 text-sky-300',
  GDScript: 'bg-lime-500/20 text-lime-300',
};

interface TopReposTabProps {
  repos: TopRepo[];
}

export function TopReposTab({ repos }: TopReposTabProps) {
  if (repos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No public repositories yet — start building to grow your skyline.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {repos.map((repo) => (
        <Card key={repo.name} className="border-white/5 bg-secondary/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-primary">{repo.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {repo.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-neon-amber text-neon-amber" />
                <span className="tabular-nums">{formatNumber(repo.stars)}</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`mt-2 text-[10px] ${LANGUAGE_COLORS[repo.language] ?? 'bg-secondary text-secondary-foreground'}`}
            >
              {repo.language}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
