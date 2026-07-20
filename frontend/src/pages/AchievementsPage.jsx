import { useAchievements } from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Trophy } from 'lucide-react';

export default function AchievementsPage() {
  const { data, isLoading, isError, refetch } = useAchievements();

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const catalog = data?.catalog || [];
  const unlocked = catalog.filter((a) => a.unlocked);
  const locked = catalog.filter((a) => !a.unlocked);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">Badges, XP rewards, and unlock progress</p>
      </div>

      {catalog.length === 0 && <EmptyState title="No achievements configured" />}

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Unlocked ({unlocked.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unlocked.map((a) => (
            <Card key={a.key} className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-base">{a.title}</CardTitle>
                </div>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Badge: {a.badge} · +{a.xpReward} XP
                {a.unlockedAt && (
                  <p className="mt-1 text-xs">Unlocked {new Date(a.unlockedAt).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Locked ({locked.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locked.map((a) => (
            <Card key={a.key} className="opacity-70">
              <CardHeader>
                <CardTitle className="text-base">{a.title}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">+{a.xpReward} XP</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
