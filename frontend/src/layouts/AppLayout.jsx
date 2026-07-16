import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { APP_NAME, ROUTES } from '../constants';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/avatar';

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard' },
  { to: ROUTES.AI_CHAT, label: 'AI Chat' },
  { to: ROUTES.RESUME_REVIEW, label: 'Resume Review' },
  { to: ROUTES.CODE_REVIEW, label: 'Code Review' },
  { to: ROUTES.INTERVIEW, label: 'Interview' },
  { to: ROUTES.PLANNER, label: 'Planner' },
  { to: ROUTES.ANALYTICS, label: 'Analytics' },
  { to: ROUTES.PROFILE, label: 'Profile' },
  { to: ROUTES.SETTINGS, label: 'Settings' },
];

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const avatarUrl = getAvatarUrl(currentUser?.avatar);

  async function handleLogout() {
    try {
      await logout();
      toast.success('Signed out');
      navigate(ROUTES.LOGIN);
    } catch {
      toast.error('Logout failed');
    }
  }

  const sidebar = (
    <>
      <div className="font-display text-xl font-bold text-primary mb-8 px-2">{APP_NAME}</div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t pt-4 px-2">
        <div className="flex items-center gap-3 mb-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {currentUser?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/60 backdrop-blur px-4 py-6">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r bg-card px-4 py-6 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <span className="font-display font-semibold text-primary">{APP_NAME}</span>
          <button type="button" onClick={() => setMobileOpen(true)} className="text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
