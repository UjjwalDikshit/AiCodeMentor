import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { codeIntelService } from '../services/codeIntelService';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const TABS = [
  { id: 'editor', label: 'Editor' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'security', label: 'Security' },
  { id: 'performance', label: 'Performance' },
  { id: 'diff', label: 'Diff' },
  { id: 'chat', label: 'Chat' },
  { id: 'history', label: 'History' },
  { id: 'analytics', label: 'Analytics' },
];

function Score({ label, value }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value ?? '—'}</div>
    </div>
  );
}

export default function CodeReviewPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'editor';

  const [list, setList] = useState([]);
  const [review, setReview] = useState(null);
  const [code, setCode] = useState('def greet(name):\n    print("hello", name)\n    for i in range(10):\n        for j in range(10):\n            pass\n');
  const [oldCode, setOldCode] = useState('');
  const [filename, setFilename] = useState('main.py');
  const [busy, setBusy] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const setTab = (next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp);
  };

  const refreshList = useCallback(async () => {
    try {
      const r = await codeIntelService.list();
      setList(r.data.data?.items || []);
    } catch {
      toast.error('Failed to load reviews');
    }
  }, []);

  const refresh = useCallback(async (reviewId) => {
    if (!reviewId) return;
    const r = await codeIntelService.get(reviewId);
    setReview(r.data.data);
    if (r.data.data?.code) setCode(r.data.data.code);
    if (r.data.data?.filename) setFilename(r.data.data.filename);
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (id) refresh(id).catch(() => toast.error('Failed to load review'));
    else setReview(null);
  }, [id, refresh]);

  useEffect(() => {
    if (!id || !review || review.status === 'ready' || review.status === 'failed') return undefined;
    const t = setInterval(() => refresh(id), 2000);
    return () => clearInterval(t);
  }, [id, review?.status, refresh]);

  useEffect(() => {
    if (tab === 'analytics') {
      codeIntelService.analytics().then((r) => setAnalytics(r.data.data)).catch(() => {});
    }
  }, [tab]);

  const det = review?.deterministic;
  const quality = det?.quality || {};
  const ai = review?.aiReview?.parsed || review?.aiReview;

  async function createFromEditor() {
    setBusy('create');
    try {
      const created = await codeIntelService.create({ code, filename, title: filename, sourceType: 'snippet' });
      const newId = created.data.data.id;
      toast.success('Created — running analysis');
      navigate(`/code-review/${newId}?tab=metrics`);
      await codeIntelService.analyze(newId, { code, filename });
      await refresh(newId);
      await refreshList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Create failed');
    } finally {
      setBusy('');
    }
  }

  async function runAction(name, fn) {
    if (!id) return;
    setBusy(name);
    try {
      await fn();
      await refresh(id);
      toast.success(`${name} complete`);
    } catch (err) {
      toast.error(err?.response?.data?.message || `${name} failed`);
    } finally {
      setBusy('');
    }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await codeIntelService.upload(fd);
      toast.success('Uploaded — analyzing in background');
      navigate(`/code-review/${r.data.data.id}?tab=metrics`);
      await refreshList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      e.target.value = '';
    }
  }

  async function onChat(e) {
    e.preventDefault();
    if (!id || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLog((p) => [...p, { role: 'user', content: msg }]);
    try {
      const r = await codeIntelService.chat(id, { message: msg });
      setChatLog((p) => [...p, { role: 'assistant', content: r.data.data?.assistantMessage?.content || '—' }]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Chat failed');
    }
  }

  const langChart = useMemo(
    () => Object.entries(analytics?.languagesReviewed || {}).map(([name, count]) => ({ name, count })),
    [analytics]
  );

  if (!id) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Code Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Detect → parse → static / complexity / security / performance → AI reasoning — not paste→LLM.
            </p>
          </div>
          <label className="inline-flex cursor-pointer">
            <input type="file" className="hidden" onChange={onUpload} accept=".zip,.py,.js,.ts,.tsx,.java,.go,.rs,.c,.cpp,.cs,.sql,.txt,.diff" />
            <Button type="button">Upload file / zip</Button>
          </label>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.py"
            />
            <Button disabled={busy === 'create'} onClick={createFromEditor}>
              {busy === 'create' ? 'Analyzing…' : 'Analyze snippet'}
            </Button>
          </div>
          <textarea
            className="min-h-56 w-full rounded-md border bg-background p-3 font-mono text-xs"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((item) => (
            <Link key={item.id} to={`/code-review/${item.id}`} className="rounded-xl border bg-card p-4 hover:border-primary/50">
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.language} · {item.status} · quality {item.qualityScore ?? '—'}
              </div>
            </Link>
          ))}
          {!list.length && (
            <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reviews yet — paste a snippet or upload code.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={ROUTES.CODE_REVIEW} className="text-xs text-muted-foreground hover:text-foreground">← All reviews</Link>
          <h1 className="font-display text-2xl font-semibold">{review?.title || 'Review'}</h1>
          <p className="text-sm text-muted-foreground">
            {review?.language} ({review?.languageConfidence}) · {review?.status}
            {review?.deterministic?.ast?.parserBackend ? ` · parser ${review.deterministic.ast.parserBackend}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy === 'Analyze'} onClick={() => runAction('Analyze', () => codeIntelService.analyze(id, { code, filename }))}>
            Re-analyze
          </Button>
          <Button size="sm" variant="outline" disabled={busy === 'Refactor'} onClick={() => runAction('Refactor', () => codeIntelService.refactor(id))}>
            Refactor
          </Button>
          <Button size="sm" variant="outline" disabled={busy === 'Interview'} onClick={() => runAction('Interview', () => codeIntelService.interview(id))}>
            Interview coach
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Overall quality" value={quality.overallScore ?? review?.qualityScore} />
        <Score label="Cyclomatic" value={det?.complexity?.cyclomaticComplexity ?? review?.cyclomatic} />
        <Score label="Security score" value={det?.security?.score ?? review?.securityScore} />
        <Score label="Maintainability" value={quality.maintainability} />
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm',
              tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'editor' && (
        <div className="space-y-3">
          <textarea
            className="min-h-80 w-full rounded-md border bg-background p-3 font-mono text-xs"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button onClick={() => runAction('Analyze', () => codeIntelService.analyze(id, { code, filename }))}>
            Save & analyze
          </Button>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <h3 className="font-medium">Quality</h3>
            {Object.entries(quality).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="capitalize text-muted-foreground">{k}</span><span>{v}</span></div>
            ))}
            <h3 className="font-medium pt-2">Complexity</h3>
            <div>Big-O: {det?.complexity?.bigOEstimated || '—'}</div>
            <div>Cognitive: {det?.complexity?.cognitiveComplexity ?? '—'}</div>
            <div>Max fn length: {det?.complexity?.maxFunctionLength ?? '—'}</div>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm">
            <h3 className="font-medium mb-2">Static findings</h3>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {(det?.static?.findings || []).map((f, i) => (
                <li key={i} className="border-b pb-1 text-xs">
                  <span className="font-medium">{f.rule}</span> · {f.severity}
                  <div className="text-muted-foreground">{f.message}{f.line ? ` (L${f.line})` : ''}</div>
                </li>
              ))}
              {!det?.static?.findings?.length && <li className="text-muted-foreground">Run analysis to see findings.</li>}
            </ul>
            {ai && (
              <div className="mt-4">
                <h3 className="font-medium">AI review</h3>
                <pre className="mt-2 max-h-48 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(ai, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-medium mb-2">Security findings</h3>
          <ul className="space-y-2 text-sm">
            {(det?.security?.findings || []).map((f, i) => (
              <li key={i} className="border-b pb-2">
                <span className="font-medium text-destructive">{f.severity}</span> — {f.message}
                <div className="text-xs text-muted-foreground">L{f.line}: {f.snippet}</div>
              </li>
            ))}
            {!det?.security?.findings?.length && <li className="text-muted-foreground">No security findings.</li>}
          </ul>
        </div>
      )}

      {tab === 'performance' && (
        <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
          <div>Nested loop depth: {det?.performance?.nestedLoopDepth ?? '—'}</div>
          <div>Estimated: {det?.performance?.bigOEstimated || '—'}</div>
          <ul className="mt-2 space-y-2">
            {(det?.performance?.findings || []).map((f, i) => (
              <li key={i} className="text-xs border-b pb-1">{f.rule}: {f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'diff' && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <textarea className="min-h-40 rounded-md border bg-background p-3 font-mono text-xs" placeholder="Old code" value={oldCode} onChange={(e) => setOldCode(e.target.value)} />
            <textarea className="min-h-40 rounded-md border bg-background p-3 font-mono text-xs" placeholder="New code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button disabled={busy === 'Diff'} onClick={() => runAction('Diff', () => codeIntelService.diff(id, { oldCode, newCode: code }))}>
            Review diff
          </Button>
          {review?.diffResult && (
            <pre className="rounded-xl border bg-card p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(review.diffResult, null, 2)}
            </pre>
          )}
          {review?.refactor && (
            <div className="rounded-xl border bg-card p-4 text-sm">
              <h3 className="font-medium">Refactor</h3>
              <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(review.refactor, null, 2)}</pre>
            </div>
          )}
          {review?.interviewCoach && (
            <div className="rounded-xl border bg-card p-4 text-sm">
              <h3 className="font-medium">Interview coach</h3>
              <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(review.interviewCoach, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex h-[28rem] flex-col rounded-xl border bg-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatLog.map((m, i) => (
              <div key={i} className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm', m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary')}>
                {m.content}
              </div>
            ))}
            {!chatLog.length && <p className="text-sm text-muted-foreground">Ask: explain this function, optimize, convert to Java, find bug, generate tests…</p>}
          </div>
          <form onSubmit={onChat} className="flex gap-2 border-t p-3">
            <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about this code…" />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-xl border bg-card p-4">
          <ul className="space-y-2 text-sm">
            {(review?.reviewHistory || []).map((h, i) => (
              <li key={i} className="flex justify-between border-b pb-1">
                <span>{h.summary}</span>
                <span className="text-xs text-muted-foreground">{h.at ? new Date(h.at).toLocaleString() : ''}</span>
              </li>
            ))}
            {!review?.reviewHistory?.length && <li className="text-muted-foreground">No history yet.</li>}
          </ul>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Score label="Reviews" value={analytics?.reviewCount} />
            <Score label="Avg quality" value={analytics?.averageQuality} />
            <Score label="Security issues" value={analytics?.securityIssues} />
          </div>
          <div className="h-64 rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Languages reviewed</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={langChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Complexity trend</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={analytics?.complexityTrends || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="title" hide />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cyclomatic" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
