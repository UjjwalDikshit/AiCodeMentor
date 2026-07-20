import { useEffect, useRef } from 'react';
import { useActivity } from '../hooks/useDashboard';
import { PageSkeleton, Skeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';

export default function ActivityPage() {
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivity();
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
        <p className="text-muted-foreground">Infinite scroll feed of your coaching actions</p>
      </div>

      {activities.length === 0 ? (
        <EmptyState title="No activity yet" description="Complete goals or update progress to see events." />
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
