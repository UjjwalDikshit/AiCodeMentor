import ComingSoon from '../components/ComingSoon';
import { useDashboard } from '../hooks/useDashboard';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  return (
    <div className="space-y-4">
      <ComingSoon
        title="Dashboard"
        description="Overview of progress, goals, and coaching signals."
      />
      <p className="text-xs text-muted-foreground">
        API probe:{' '}
        {isLoading && 'loading…'}
        {isError && 'backend unreachable (start backend + mongo)'}
        {data && `${data.message || 'OK'}`}
      </p>
    </div>
  );
}
