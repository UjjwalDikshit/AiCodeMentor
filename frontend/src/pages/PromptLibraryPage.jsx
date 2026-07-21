import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { Button } from '../components/ui/button';
import { chatService } from '../services/chatService';
import { getAccessToken } from '../lib/token';

const CATEGORIES = ['Coding', 'Interview', 'Resume', 'Career', 'System Design', 'Debugging', 'Architecture', 'Other'];

export default function PromptLibraryPage() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'Coding', registryKey: 'chat_general', body: '' });

  async function load() {
    const { data } = await chatService.prompts.list({ category: category || undefined, q: q || undefined });
    setItems(data.data?.items || []);
  }

  useEffect(() => {
    load().catch(() => toast.error('Failed to load prompts'));
  }, [category]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Prompt Library</h1>
          <p className="text-sm text-muted-foreground">Maps to Prompt Registry YAML keys — no hardcoded AI prompts in services.</p>
        </div>
        <div className="flex gap-2">
          <Link to={ROUTES.AI_CHAT}><Button variant="outline" size="sm">Back to Copilot</Button></Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const token = getAccessToken();
              const res = await fetch(chatService.prompts.exportUrl(), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include',
              });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'prompts.json';
              a.click();
            }}
          >
            Export
          </Button>
          <label>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                try {
                  const text = await e.target.files?.[0]?.text();
                  if (!text) return;
                  await chatService.prompts.import(JSON.parse(text));
                  toast.success('Imported');
                  load();
                } catch {
                  toast.error('Import failed');
                }
              }}
            />
            <Button type="button" size="sm" variant="outline" asChild={false}>Import</Button>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Button size="sm" onClick={load}>Search</Button>
      </div>

      <form
        className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await chatService.prompts.create(form);
          toast.success('Created');
          setForm({ title: '', category: 'Coding', registryKey: 'chat_general', body: '' });
          load();
        }}
      >
        <input required className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Registry key (e.g. chat_general)" value={form.registryKey} onChange={(e) => setForm({ ...form, registryKey: e.target.value })} />
        <textarea className="md:col-span-2 min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm" placeholder="Prompt body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <Button type="submit" size="sm">Add prompt</Button>
      </form>

      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{p.title} {p.isFavorite ? '★' : ''}</div>
                <div className="text-xs text-muted-foreground">{p.category} · registry: {p.registryKey} · v{(p.versions || []).length || 1}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPreview(p)}>Preview</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await chatService.prompts.update(p.id, { isFavorite: !p.isFavorite }); load(); }}>Favorite</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await chatService.prompts.duplicate(p.id); load(); }}>Duplicate</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await chatService.prompts.remove(p.id); load(); }}>Delete</Button>
              </div>
            </div>
            {preview?.id === p.id && (
              <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{p.body || '(empty body — uses registry YAML)'}</pre>
            )}
            {(p.versions || []).length > 1 && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary>Version history ({p.versions.length})</summary>
                <ul className="mt-1 space-y-1">
                  {p.versions.map((v) => (
                    <li key={v.version + v.createdAt}>v{v.version} — {new Date(v.createdAt).toLocaleString()}</li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
