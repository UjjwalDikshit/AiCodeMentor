import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, ROUTES } from '../constants';
import { cn } from '../lib/utils';

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard' },
  { to: ROUTES.AI_CHAT, label: 'AI Chat' },
  { to: ROUTES.RESUME_REVIEW, label: 'Resume Review' },
  { to: ROUTES.CODE_REVIEW, label: 'Code Review' },
  { to: ROUTES.INTERVIEW, label: 'Interview' },
  { to: ROUTES.PLANNER, label: 'Planner' },
  { to: ROUTES.ANALYTICS, label: 'Analytics' },
  { to: ROUTES.PROFILE, label: 'Profile' },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card/60 backdrop-blur px-4 py-6">
        <div className="font-display text-xl font-bold text-primary mb-8 px-2">{APP_NAME}</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b px-4 py-3 font-display font-semibold text-primary">
          {APP_NAME}
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
