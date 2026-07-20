import { useEffect, useMemo, useRef, useState } from 'react';
import { useActivity } from '../hooks/useDashboard';
import { PageSkeleton, Skeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Card, CardContent } from '../components/ui/card';

const ACTIVITY_TYPES = [
  '',
  'login',
  'problem_solved',
  'goal_completed',
  'goal_created',
  'interview',
  'resume_reviewed',
  'achievement_unlocked',
  'xp_gained',
  'progress_updated',
  'other',
];

export default function ActivityPage() {
  const [type, setType] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = useMemo(() => {
    const next = { sort };
    if (type) next.type = type;
    if (startDate) next.startDate = startDate;
    if (endDate) next.endDate = endDate;
    return next;
  }, [type, sort, startDate, endDate]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivity(filters);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const activities = data?.pages?.flatMap((p) => p.activities) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground">Filter, sort, and infinite-scroll your feed</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {ACTIVITY_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              aria-label="Sort activities"
            >
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-points">Most XP</option>
              <option value="points">Least XP</option>
              <option value="type">Type A–Z</option>
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              aria-label="Start date"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              aria-label="End date"
            />
          </label>
        </CardContent>
      </Card>

      {activities.length === 0 ? (
        <EmptyState title="No activity yet" description="Try clearing filters or completing a goal." />
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => (
            <li key={a._id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="uppercase tracking-wide">{a.type}</span>
                    {' · '}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {a.points > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    +{a.points} XP
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="py-4">
        {isFetchingNextPage && <Skeleton className="h-16 w-full" />}
        {!hasNextPage && activities.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">You&apos;re all caught up</p>
        )}
      </div>
    </div>
  );
}
