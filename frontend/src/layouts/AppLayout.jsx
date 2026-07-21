import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { APP_NAME, ROUTES } from '../constants';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { ErrorBoundary } from '../components/ErrorBoundary';

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard' },
  { to: ROUTES.AI_CHAT, label: 'AI Chat' },
  { to: ROUTES.PROMPT_LIBRARY, label: 'Prompt Library' },
  { to: ROUTES.CHAT_ANALYTICS, label: 'Chat Analytics' },
  { to: ROUTES.PROGRESS, label: 'Progress' },
  { to: ROUTES.GOALS, label: 'Goals' },
  { to: ROUTES.RESUME_REVIEW, label: 'Resume Intelligence' },
  { to: ROUTES.CODE_REVIEW, label: 'Code Intelligence' },
  { to: ROUTES.INTERVIEW, label: 'Interview' },
  { to: ROUTES.GITHUB_REVIEW, label: 'GitHub Review' },
  { to: ROUTES.PLANNER, label: 'Planner' },
  { to: ROUTES.ANALYTICS, label: 'Analytics' },
  { to: ROUTES.ACHIEVEMENTS, label: 'Achievements' },
  { to: ROUTES.ACTIVITY, label: 'Activity' },
  { to: ROUTES.SETTINGS, label: 'Settings' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="font-display text-xl font-bold text-primary mb-6 px-2">{APP_NAME}</div>
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto" aria-label="Main">
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
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Logout
      </button>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card/60 px-3 py-5">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r bg-card px-3 py-5 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
