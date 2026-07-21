import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { resumeService } from '../services/resumeService';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'sections', label: 'Sections' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'ats', label: 'ATS' },
  { id: 'jd', label: 'JD Match' },
  { id: 'chat', label: 'Chat' },
  { id: 'analytics', label: 'Analytics' },
];

function ScoreRing({ score }) {
  const value = Number(score);
  if (Number.isNaN(value)) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/40 bg-card">
      <span className="text-xl font-semibold">{Math.round(value)}</span>
    </div>
  );
}

function currentVersion(resume) {
  if (!resume) return null;
  return resume.versions?.find((v) => v.version === resume.currentVersion) || resume.versions?.at(-1);
}

export default function ResumeReviewPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'overview';

  const uploadInputRef = useRef(null);
  const versionInputRef = useRef(null);
  const [list, setList] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [jdText, setJdText] = useState('');
  const [jdList, setJdList] = useState([]);
  const [match, setMatch] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [kbQuery, setKbQuery] = useState('skills experience projects');
  const [kbHits, setKbHits] = useState([]);
  const [busy, setBusy] = useState('');

  const ver = useMemo(() => currentVersion(resume), [resume]);

  const setTab = (next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp);
  };

  const refreshList = useCallback(async () => {
    try {
      const r = await resumeService.list();
      setList(r.data.data?.items || []);
    } catch {
      toast.error('Failed to load resumes');
    }
  }, []);

  const refreshResume = useCallback(async (resumeId) => {
    if (!resumeId) return;
    setLoading(true);
    try {
      const r = await resumeService.get(resumeId);
      setResume(r.data.data);
    } catch {
      toast.error('Failed to load resume');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (id) refreshResume(id);
    else setResume(null);
  }, [id, refreshResume]);

  useEffect(() => {
    if (!id || tab !== 'analytics') return;
    resumeService.analytics(id).then((r) => setAnalytics(r.data.data)).catch(() => {});
  }, [id, tab, resume?.atsHistory?.length]);

  useEffect(() => {
    if (tab === 'jd') {
      resumeService.listJd().then((r) => setJdList(r.data.data || [])).catch(() => {});
    }
  }, [tab]);

  // Poll while indexing
  useEffect(() => {
    if (!id || !ver || ver.indexStatus === 'ready' || ver.indexStatus === 'failed') return undefined;
    const t = setInterval(() => refreshResume(id), 2500);
    return () => clearInterval(t);
  }, [id, ver?.indexStatus, refreshResume]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await resumeService.upload(fd);
      toast.success('Uploaded — indexing in background');
      await refreshList();
      navigate(`/resume/${r.data.data.id}?tab=overview`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function onVersion(e) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await resumeService.addVersion(id, fd);
      toast.success('New version uploaded');
      await refreshResume(id);
      await refreshList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Version upload failed');
    } finally {
      e.target.value = '';
    }
  }

  async function runAction(name, fn) {
    setBusy(name);
    try {
      await fn();
      await refreshResume(id);
      toast.success(`${name} complete`);
    } catch (err) {
      toast.error(err?.response?.data?.message || `${name} failed`);
    } finally {
      setBusy('');
    }
  }

  async function onSearchKb() {
    if (!id) return;
    try {
      const r = await resumeService.search(id, { query: kbQuery, k: 8 });
      setKbHits(r.data.data?.hits || []);
    } catch {
      toast.error('Search failed');
    }
  }

  async function onCreateAndMatchJd() {
    if (!id || !jdText.trim()) return;
    setBusy('jd');
    try {
      const created = await resumeService.createJd({ text: jdText, resumeId: id, title: 'Target role JD' });
      const jdId = created.data.data.id;
      const matched = await resumeService.matchJd(id, jdId);
      setMatch(matched.data.data?.match || matched.data.data);
      const list = await resumeService.listJd();
      setJdList(list.data.data || []);
      toast.success('JD matched');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'JD match failed');
    } finally {
      setBusy('');
    }
  }

  async function onChatSend(e) {
    e.preventDefault();
    if (!id || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLog((prev) => [...prev, { role: 'user', content: msg }]);
    try {
      const r = await resumeService.chat(id, { message: msg });
      const reply = r.data.data?.assistantMessage?.content || 'No reply';
      setChatLog((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Chat failed');
    }
  }

  // List view (no id)
  if (!id) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Resume Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Parse → knowledge base → retrieval → pipeline analysis — not a simple ATS scorer.
            </p>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => uploadInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload resume'}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((item) => {
            const cv = item.versions?.find((v) => v.version === item.currentVersion);
            return (
              <Link
                key={item.id}
                to={`/resume/${item.id}`}
                className="rounded-xl border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.targetRole}</div>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">v{item.currentVersion}</span>
                </div>
                <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                  <span>{cv?.indexStatus || 'pending'}</span>
                  <span>{cv?.chunkCount || 0} chunks</span>
                  <span>{item.versions?.length || 0} versions</span>
                </div>
              </Link>
            );
          })}
          {!list.length && (
            <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Upload a PDF, DOCX, TXT, or Markdown resume to build your knowledge base.
            </div>
          )}
        </div>
      </div>
    );
  }

  const structured = ver?.structured || {};
  const sectionKeys = [
    'header', 'summary', 'skills', 'experience', 'projects', 'education',
    'achievements', 'certifications', 'publications', 'links', 'languages', 'miscellaneous',
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={ROUTES.RESUME_REVIEW} className="text-xs text-muted-foreground hover:text-foreground">← All resumes</Link>
          <h1 className="font-display text-2xl font-semibold">{resume?.title || 'Resume'}</h1>
          <p className="text-sm text-muted-foreground">
            {resume?.targetRole} · v{resume?.currentVersion} · index: {ver?.indexStatus || '—'}
            {ver?.embeddingModel ? ` · ${ver.embeddingModel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={versionInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={onVersion}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => versionInputRef.current?.click()}
          >
            New version
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy === 'reindex'}
            onClick={() => runAction('reindex', () => resumeService.reindex(id))}
          >
            Re-index
          </Button>
        </div>
      </div>

      {/* Version timeline */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(resume?.versions || []).map((v) => (
          <div
            key={v.version}
            className={cn(
              'min-w-[110px] rounded-lg border px-3 py-2 text-xs',
              v.version === resume.currentVersion ? 'border-primary bg-primary/5' : 'bg-card'
            )}
          >
            <div className="font-medium">v{v.version}</div>
            <div className="text-muted-foreground">{v.indexStatus}</div>
            <div className="text-muted-foreground">{v.chunkCount} chunks</div>
          </div>
        ))}
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

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 md:col-span-1 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground">Latest ATS</div>
            <ScoreRing score={ver?.ats?.overallScore ?? ver?.ats?.parsed?.overallScore} />
            <Button
              size="sm"
              disabled={busy === 'ATS' || ver?.indexStatus !== 'ready'}
              onClick={() => runAction('ATS', () => resumeService.ats(id))}
            >
              Run ATS
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-4 md:col-span-2 space-y-2 text-sm">
            <div><span className="text-muted-foreground">Chunks:</span> {ver?.chunkCount ?? 0}</div>
            <div><span className="text-muted-foreground">Collection:</span> {ver?.collectionName || '—'}</div>
            <div><span className="text-muted-foreground">File:</span> {ver?.file?.originalName || '—'}</div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={busy === 'Skills' || ver?.indexStatus !== 'ready'} onClick={() => runAction('Skills', () => resumeService.skills(id))}>Skill gap</Button>
              <Button size="sm" variant="outline" disabled={busy === 'Bullets' || ver?.indexStatus !== 'ready'} onClick={() => runAction('Bullets', () => resumeService.bullets(id))}>Improve bullets</Button>
              <Button size="sm" variant="outline" disabled={busy === 'Report' || ver?.indexStatus !== 'ready'} onClick={() => runAction('Report', () => resumeService.report(id, { format: 'json' }))}>Report</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === 'Compare' || (resume?.versions?.length || 0) < 2}
                onClick={() => {
                  const prev = (resume?.versions || [])
                    .map((v) => v.version)
                    .filter((v) => v !== resume.currentVersion)
                    .sort((a, b) => b - a)[0];
                  if (!prev) return;
                  runAction('Compare', () => resumeService.compare(id, { v1: prev, v2: resume.currentVersion }));
                }}
              >
                Compare versions
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === 'Rollback' || (resume?.versions?.length || 0) < 2 || resume?.currentVersion === 1}
                onClick={() => {
                  const prev = resume.currentVersion - 1;
                  runAction('Rollback', () => resumeService.rollback(id, { version: prev }));
                }}
              >
                Rollback
              </Button>
            </div>
            {ver?.indexError && <p className="text-destructive text-xs">{ver.indexError}</p>}
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="grid gap-3 md:grid-cols-2">
          {sectionKeys.map((key) => {
            const content = key === 'contact' ? structured.contact : structured[key];
            const conf = structured.sectionConfidence?.[key];
            if (!content || (typeof content === 'string' && !content.trim())) return null;
            return (
              <div key={key} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium capitalize">{key}</h3>
                  {conf != null && <span className="text-xs text-muted-foreground">conf {conf}</span>}
                </div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={kbQuery}
              onChange={(e) => setKbQuery(e.target.value)}
              placeholder="Search resume knowledge base…"
            />
            <Button onClick={onSearchKb}>Search</Button>
          </div>
          <div className="space-y-2">
            {kbHits.map((h) => (
              <div key={h.id} className="rounded-xl border bg-card p-3 text-sm">
                <div className="mb-1 flex gap-2 text-xs text-muted-foreground">
                  <span>{h.metadata?.section}</span>
                  <span>v{h.metadata?.version}</span>
                  {h.similarity != null && <span>sim {h.similarity}</span>}
                </div>
                <p className="whitespace-pre-wrap text-xs">{h.document}</p>
              </div>
            ))}
            {!kbHits.length && <p className="text-sm text-muted-foreground">Run a search to inspect chunks.</p>}
          </div>
        </div>
      )}

      {tab === 'ats' && (
        <div className="space-y-4">
          <Button disabled={busy === 'ATS' || ver?.indexStatus !== 'ready'} onClick={() => runAction('ATS', () => resumeService.ats(id))}>
            {busy === 'ATS' ? 'Evaluating…' : 'Run ATS evaluation'}
          </Button>
          {ver?.ats && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 flex flex-col items-center">
                <ScoreRing score={ver.ats.overallScore ?? ver.ats.parsed?.overallScore} />
                <div className="mt-2 text-sm">Overall ATS</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-medium mb-2">Section scores</h3>
                <ul className="space-y-1 text-sm">
                  {Object.entries(ver.ats.sectionScores || ver.ats.parsed?.sectionScores || {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-4 md:col-span-2">
                <h3 className="text-sm font-medium">Recommendations</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                  {(ver.ats.recommendations || ver.ats.parsed?.recommendations || []).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {ver?.bullets && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium mb-2">Bullet improvements</h3>
              <div className="space-y-3">
                {(ver.bullets.items || ver.bullets.parsed?.items || []).map((item, i) => (
                  <div key={i} className="text-xs border-b pb-2">
                    <div className="text-muted-foreground">Original: {item.original}</div>
                    <div className="text-foreground">Improved: {item.improved}</div>
                    <div className="text-muted-foreground">{item.reason} ({item.confidence})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ver?.skills && (
            <div className="rounded-xl border bg-card p-4 text-sm">
              <h3 className="font-medium mb-2">Skill gap</h3>
              <pre className="overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(ver.skills, null, 2)}</pre>
            </div>
          )}
          {ver?.report && (
            <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
              <h3 className="font-medium">Report</h3>
              <p><strong>Executive:</strong> {ver.report.executiveSummary || ver.report.parsed?.executiveSummary}</p>
              <p><strong>Technical:</strong> {ver.report.technicalSummary || ver.report.parsed?.technicalSummary}</p>
              <p><strong>Recruiter:</strong> {ver.report.recruiterSummary || ver.report.parsed?.recruiterSummary}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'jd' && (
        <div className="space-y-4">
          <textarea
            className="min-h-40 w-full rounded-md border bg-background p-3 text-sm"
            placeholder="Paste a job description…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <Button disabled={busy === 'jd' || ver?.indexStatus !== 'ready'} onClick={onCreateAndMatchJd}>
            {busy === 'jd' ? 'Matching…' : 'Index JD & match'}
          </Button>
          {match && (
            <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
              <div>Match: <strong>{match.matchPercent ?? match.parsed?.matchPercent ?? '—'}%</strong></div>
              <div>Missing: {(match.missingKeywords || match.parsed?.missingKeywords || []).join(', ') || '—'}</div>
              <div>Matched skills: {(match.matchedSkills || match.parsed?.matchedSkills || []).join(', ') || '—'}</div>
              <ul className="list-disc pl-5 text-muted-foreground">
                {(match.recommendedImprovements || match.parsed?.recommendedImprovements || []).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {jdList.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium mb-2">Saved JDs</h3>
              <ul className="space-y-1 text-sm">
                {jdList.map((j) => (
                  <li key={j.id} className="flex justify-between gap-2">
                    <span>{j.title} {j.company && `· ${j.company}`}</span>
                    <span className="text-xs text-muted-foreground">{j.chunkCount} chunks</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex h-[28rem] flex-col rounded-xl border bg-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatLog.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary'
                )}
              >
                {m.content}
              </div>
            ))}
            {!chatLog.length && (
              <p className="text-sm text-muted-foreground">
                Ask: explain weak points, improve a project, tailor for Amazon/Google…
              </p>
            )}
          </div>
          <form onSubmit={onChatSend} className="flex gap-2 border-t p-3">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about this resume…"
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="h-64 rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">ATS history</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={analytics?.atsHistory || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="version" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="overallScore" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Skill growth by version</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={analytics?.skillGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="version" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="strong" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="weak" fill="hsl(var(--muted-foreground))" radius={4} />
                <Bar dataKey="missing" fill="hsl(var(--destructive))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium mb-2">Versions</h3>
            <ul className="space-y-1 text-sm">
              {(analytics?.versions || []).map((v) => (
                <li key={v.version} className="flex justify-between">
                  <span>v{v.version} · {v.indexStatus}</span>
                  <span>{v.chunkCount} chunks · ATS {v.overallScore ?? '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
