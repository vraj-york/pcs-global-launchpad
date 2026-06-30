import { ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementsTab } from '@/components/profile/AchievementsTab';
import { ContributionHeatmap } from '@/components/profile/ContributionHeatmap';
import { ProfileStatsCards } from '@/components/profile/ProfileStatsCards';
import { TopReposTab } from '@/components/profile/TopReposTab';
import { useDevelopersContext } from '@/context/DevelopersContext';
import { useCityStore } from '@/store/useCityStore';
import { formatDate } from '@/lib/utils';

export function ProfilePanel() {
  const selectedDeveloperId = useCityStore((s) => s.selectedDeveloperId);
  const setSelectedDeveloper = useCityStore((s) => s.setSelectedDeveloper);
  const openShop = useCityStore((s) => s.openShop);
  const clearFlyTarget = useCityStore((s) => s.clearFlyTarget);
  const { getDeveloperById } = useDevelopersContext();

  const developer = selectedDeveloperId ? getDeveloperById(selectedDeveloperId) : null;
  const open = !!developer;

  const handleClose = () => {
    setSelectedDeveloper(null);
    clearFlyTarget();
  };

  if (!developer) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="overflow-y-auto border-white/10 sm:max-w-[420px]">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4 pr-8">
            <img
              src={developer.avatarUrl}
              alt={developer.displayName}
              className="h-16 w-16 rounded-full border-2 border-neon-cyan/30"
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-left">{developer.displayName}</SheetTitle>
              <p className="text-sm text-primary">@{developer.username}</p>
              {developer.isOnline && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Online now
                </span>
              )}
            </div>
          </div>

          <p className="text-left text-sm leading-relaxed text-muted-foreground">{developer.bio}</p>

          {developer.location && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {developer.location}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6 px-6 pb-6">
          <ProfileStatsCards
            contributions={developer.contributions}
            repoCount={developer.repoCount}
            starCount={developer.starCount}
            followers={developer.followers}
          />

          <Tabs defaultValue="overview">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="repos" className="flex-1 text-xs">
                Top Repos
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex-1 text-xs">
                Achievements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Joined GitHub</p>
                <p className="text-sm font-medium">{formatDate(developer.joinedDate)}</p>
              </div>
              <ContributionHeatmap seed={developer.username} />
            </TabsContent>

            <TabsContent value="repos">
              <TopReposTab repos={developer.topRepos} />
            </TabsContent>

            <TabsContent value="achievements">
              <AchievementsTab unlocked={developer.achievements} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled
              title="TODO: replace with real GitHub profile link"
            >
              <ExternalLink className="h-4 w-4" />
              Visit GitHub Profile
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => openShop(developer.id)}
            >
              <Sparkles className="h-4 w-4" />
              Customize Building
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
