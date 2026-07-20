import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalytics } from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

function ChartCard({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!data) return <EmptyState title="No analytics data" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Historical trends powered by Recharts</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Problems solved (30 days)" description="Daily problem completions">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.problemsSolved30}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(199 89% 37%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Interview score trend" description="Mock interview performance">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.interviewScoreTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="hsl(173 58% 34%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="XP growth" description="Cumulative XP over 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.xpGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis width={36} />
              <Tooltip />
              <Area type="monotone" dataKey="xp" stroke="hsl(199 89% 37%)" fill="hsl(199 89% 37% / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly coding activity" description="Last 7 days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeklyCoding}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(222 47% 30%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
