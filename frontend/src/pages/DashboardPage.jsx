import { Link } from 'react-router-dom';
import { Flame, Target, Trophy, Zap } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState, StatCard } from '../components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState title="Failed to load dashboard" onRetry={refetch} />;
  if (!data) return <EmptyState title="No dashboard data" description="Seed the database or complete onboarding." />;

  const goals = data.todaysGoals?.goals || [];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome back, {currentUser?.name?.split(' ')[0] || 'Coach'}
        </h1>
        <p className="text-muted-foreground mt-1">Your SaaS coaching command center</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label="Current streak" value={data.streak?.current ?? 0} hint={`Longest: ${data.streak?.longest ?? 0} days`} />
        <StatCard icon={Zap} label="XP" value={data.xp?.current ?? 0} hint={`Level ${data.xp?.level} · ${data.xp?.rank}`} />
        <StatCard icon={Trophy} label="Problems solved" value={data.statistics?.totalSolved ?? 0} hint={`${data.statistics?.easySolved}E / ${data.statistics?.mediumSolved}M / ${data.statistics?.hardSolved}H`} />
        <StatCard icon={Target} label="Today's goals" value={`${data.todaysGoals?.completedGoals ?? 0}/${goals.length}`} hint={`${data.todaysGoals?.completionPercentage ?? 0}% complete`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s goals</CardTitle>
            <CardDescription>Track daily execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {goals.length === 0 ? (
              <EmptyState
                title="No goals yet"
                description="Create your first goal for today."
                action={
                  <Link to={ROUTES.GOALS} className="text-sm text-primary hover:underline">
                    Go to Goals
                  </Link>
                }
              />
            ) : (
              goals.map((g) => (
                <div key={g._id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className={g.completed ? 'line-through text-muted-foreground' : ''}>{g.title}</span>
                  <span className="text-xs uppercase text-muted-foreground">{g.priority}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest coaching signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.recentActivity || []).slice(0, 6).map((a) => (
              <div key={a._id} className="rounded-md border px-3 py-2">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.type} · {a.points ? `+${a.points} XP` : 'no XP'} ·{' '}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            <Link to={ROUTES.ACTIVITY} className="inline-block text-sm text-primary hover:underline pt-2">
              View all activity
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Scores</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Coding', data.statistics?.codingScore],
              ['Interview', data.statistics?.interviewScore],
              ['Resume', data.statistics?.resumeScore],
              ['GitHub', data.statistics?.githubScore],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-secondary/50 px-3 py-2">
                <p className="text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value ?? 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weak topics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(data.weakTopics || []).length === 0 && <p className="text-sm text-muted-foreground">None yet</p>}
            {(data.weakTopics || []).map((t) => (
              <span key={t} className="rounded-full border px-3 py-1 text-xs">
                {t}
              </span>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.achievements || []).length === 0 && <p className="text-sm text-muted-foreground">No unlocks yet</p>}
            {(data.achievements || []).map((a) => (
              <div key={a._id} className="text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">+{a.xpReward} XP</p>
              </div>
            ))}
            <Link to={ROUTES.ACHIEVEMENTS} className="inline-block text-sm text-primary hover:underline">
              View all
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
