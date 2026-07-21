import { useMemo, useState } from 'react';
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Trash2,
  Pencil,
  PanelLeftClose,
  PanelLeft,
  Star,
} from 'lucide-react';
import {
  isToday,
  isYesterday,
  isWithinInterval,
  subDays,
  startOfDay,
} from 'date-fns';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

function groupConversations(items) {
  const groups = {
    Today: [],
    Yesterday: [],
    'Last Week': [],
    'Last Month': [],
    Older: [],
  };
  const now = new Date();
  for (const c of items) {
    const d = new Date(c.updatedAt || c.lastActiveAt);
    if (isToday(d)) groups.Today.push(c);
    else if (isYesterday(d)) groups.Yesterday.push(c);
    else if (isWithinInterval(d, { start: startOfDay(subDays(now, 7)), end: now })) groups['Last Week'].push(c);
    else if (isWithinInterval(d, { start: startOfDay(subDays(now, 30)), end: now })) groups['Last Month'].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onArchive,
  onPin,
  onFavorite,
  onDuplicate,
  onSearchOpen,
  onLoadMore,
  hasMore,
  collapsed,
  onToggle,
  loading,
  templates = [],
  onUseTemplate,
}) {
  const [menuId, setMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');

  const flat = useMemo(() => conversations || [], [conversations]);
  const groups = useMemo(() => groupConversations(flat), [flat]);

  return (
    <aside
      className={cn('flex h-full flex-col border-r bg-card/70 transition-all', collapsed ? 'w-14' : 'w-72')}
      aria-label="Chat conversations"
    >
      <div className="flex items-center gap-2 p-3">
        <Button type="button" variant="ghost" size="sm" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
        {!collapsed && (
          <>
            <Button type="button" className="flex-1" size="sm" onClick={onNew} aria-label="New chat">
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSearchOpen} aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {templates.length > 0 && (
            <div className="mb-3">
              <h3 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Templates</h3>
              <div className="flex flex-wrap gap-1 px-1">
                {templates.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUseTemplate?.(t)}
                    className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-secondary"
                    style={{ borderColor: t.color }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="px-2 text-xs text-muted-foreground">Loading…</p>}
          {Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} className="mb-3">
                <h3 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
                <ul className="space-y-0.5">
                  {items.map((c) => (
                    <li key={c.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary',
                          activeId === c.id && 'bg-secondary font-medium'
                        )}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color || '#6366f1' }} />
                        {c.isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                        {c.isFavorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                        {renamingId === c.id ? (
                          <input
                            className="w-full rounded border bg-background px-1 text-sm"
                            value={titleDraft}
                            autoFocus
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => {
                              onRename?.(c.id, titleDraft);
                              setRenamingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRename?.(c.id, titleDraft);
                                setRenamingId(null);
                              }
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                        ) : (
                          <span className="truncate">{c.title}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="absolute right-1 top-1.5 rounded p-1 hover:bg-background"
                        onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        aria-label="Conversation menu"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === c.id && (
                        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border bg-popover p-1 text-sm shadow-md">
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary" onClick={() => { setRenamingId(c.id); setTitleDraft(c.title); setMenuId(null); }}>
                            <Pencil className="h-3.5 w-3.5" /> Rename
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary" onClick={() => { onPin?.(c); setMenuId(null); }}>
                            <Pin className="h-3.5 w-3.5" /> {c.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary" onClick={() => { onFavorite?.(c); setMenuId(null); }}>
                            <Star className="h-3.5 w-3.5" /> {c.isFavorite ? 'Unfavorite' : 'Favorite'}
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary" onClick={() => { onDuplicate?.(c); setMenuId(null); }}>
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary" onClick={() => { onArchive?.(c); setMenuId(null); }}>
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-secondary" onClick={() => { onDelete?.(c.id); setMenuId(null); }}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          {hasMore && (
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onLoadMore}>
              Load more
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
