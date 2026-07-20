import { useState } from 'react';
import toast from 'react-hot-toast';
import { useProgress, useUpdateProgress } from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState, StatCard } from '../components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Flame, Zap, Award, BarChart3 } from 'lucide-react';

export default function ProgressPage() {
  const { data: progress, isLoading, isError, refetch } = useProgress();
  const updateProgress = useUpdateProgress();
  const [scores, setScores] = useState(null);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!progress) return <EmptyState title="No progress yet" />;

  const form = scores || {
    codingScore: progress.codingScore,
    interviewScore: progress.interviewScore,
    resumeScore: progress.resumeScore,
    githubScore: progress.githubScore,
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      await updateProgress.mutateAsync({
        codingScore: Number(form.codingScore),
        interviewScore: Number(form.interviewScore),
        resumeScore: Number(form.resumeScore),
        githubScore: Number(form.githubScore),
      });
      toast.success('Progress updated');
      setScores(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground">Current XP, level, streak, and skill scores</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="XP" value={progress.currentXP} hint={`Next level in ${progress.xpToNext} XP`} />
        <StatCard icon={Award} label="Level" value={progress.currentLevel} hint={progress.rank} />
        <StatCard icon={Flame} label="Streak" value={progress.currentStreak} hint={`Longest ${progress.longestStreak}`} />
        <StatCard icon={BarChart3} label="Solved" value={progress.totalSolved} hint={`${progress.easySolved}E / ${progress.mediumSolved}M / ${progress.hardSolved}H`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill scores</CardTitle>
            <CardDescription>Optimistic updates enabled</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              {['codingScore', 'interviewScore', 'resumeScore', 'githubScore'].map((key) => (
                <label key={key} className="block text-sm">
                  <span className="capitalize text-muted-foreground">{key.replace('Score', '')}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form[key]}
                    onChange={(e) => setScores({ ...form, [key]: e.target.value })}
                    className="mt-1"
                  />
                </label>
              ))}
              <Button type="submit" disabled={updateProgress.isPending}>
                {updateProgress.isPending ? 'Saving…' : 'Save scores'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Strong</p>
              <div className="flex flex-wrap gap-2">
                {(progress.strongTopics || []).map((t) => (
                  <span key={t} className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Weak</p>
              <div className="flex flex-wrap gap-2">
                {(progress.weakTopics || []).map((t) => (
                  <span key={t} className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
