import { useEffect, useRef, useState } from 'react';
import { Bell, Moon, Search, Sun, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useMarkNotificationRead, useNotifications } from '../../hooks/useDashboard';
import { getAvatarUrl } from '../../utils/avatar';
import { ROUTES } from '../../constants';
import { cn } from '../../lib/utils';

export default function Navbar({ onMenuClick }) {
  const { theme, cycleTheme, resolvedTheme } = useTheme();
  const { currentUser } = useAuth();
  const { data: notifData } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifData?.meta?.unreadCount || 0;
  const notifications = notifData?.notifications || [];
  const avatarUrl = getAvatarUrl(currentUser?.avatar);

  useEffect(() => {
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur">
      <button
        type="button"
        className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-secondary"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <span className="sr-only">Menu</span>
        ☰
      </button>

      <div className="relative hidden sm:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search goals, activity…"
          aria-label="Search"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={cycleTheme}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
          aria-label={`Theme: ${theme}. Click to change.`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary"
            aria-label="Notifications"
            aria-expanded={open}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-lg border bg-card p-2 shadow-lg"
              role="menu"
              aria-label="Notifications panel"
            >
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Notifications</p>
              <ul className="max-h-72 overflow-auto">
                {notifications.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</li>
                )}
                {notifications.map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary',
                        !n.isRead && 'bg-secondary/60'
                      )}
                      onClick={() => {
                        if (!n.isRead && !String(n._id).startsWith('dummy')) {
                          markRead.mutate(n._id);
                        }
                      }}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      {!n.isRead && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-primary">Unread · click to mark read</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Link
          to={ROUTES.PROFILE}
          className="flex items-center gap-2 rounded-md p-1.5 hover:bg-secondary"
          aria-label="Open profile"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
