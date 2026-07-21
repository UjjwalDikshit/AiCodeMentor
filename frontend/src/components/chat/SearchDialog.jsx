import { useEffect, useState } from 'react';
import { conversationService } from '../../services/chatService';
import { Button } from '../ui/button';

export default function SearchDialog({ open, onClose, onSelectConversation }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ conversations: [], messages: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults({ conversations: [], messages: [] });
        return;
      }
      setLoading(true);
      try {
        const { data } = await conversationService.search(q.trim());
        setResults(data.data || { conversations: [], messages: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  function highlight(text) {
    if (!q.trim()) return text;
    const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'ig'));
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-foreground">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search conversations">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
        <div className="flex items-center gap-2 border-b p-3">
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search titles and messages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
            aria-label="Search query"
          />
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Esc
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 text-sm">
          {loading && <p className="p-2 text-muted-foreground">Searching…</p>}
          {!loading && q && results.conversations.length === 0 && results.messages.length === 0 && (
            <p className="p-2 text-muted-foreground">No matches</p>
          )}
          {results.conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                onSelectConversation?.(c.id);
                onClose?.();
              }}
            >
              <div className="font-medium">{highlight(c.title)}</div>
              <div className="truncate text-xs text-muted-foreground">{highlight(c.lastMessage || '')}</div>
            </button>
          ))}
          {results.messages.map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                onSelectConversation?.(m.conversationId);
                onClose?.();
              }}
            >
              <div className="text-xs text-muted-foreground">{m.role}</div>
              <div className="line-clamp-2">{highlight(m.content)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
