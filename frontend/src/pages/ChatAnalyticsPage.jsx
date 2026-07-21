import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ROUTES } from '../constants';
import { Button } from '../components/ui/button';
import { chatService } from '../services/chatService';

export default function ChatAnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    chatService.analytics({ days: 30 }).then((r) => setData(r.data.data)).catch(() => {});
  }, []);

  const totals = data?.totals || {};
  const daily = data?.daily || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Copilot Analytics</h1>
          <p className="text-sm text-muted-foreground">Tokens, cost, latency, and provider usage from pipeline telemetry.</p>
        </div>
        <Link to={ROUTES.AI_CHAT}><Button variant="outline" size="sm">Back to Copilot</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total tokens', totals.totalTokens || 0],
          ['Requests', totals.requests || 0],
          ['Est. cost', (totals.estimatedCost || 0).toFixed?.(6) ?? totals.estimatedCost],
          ['Weekly tokens', data?.weekly?.totalTokens || 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="h-72 rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Daily usage (30d)</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="totalTokens" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Providers</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(data?.providers || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Models</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(data?.models || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
