import { Link, Outlet } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, ROUTES } from '../constants';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Link to={ROUTES.DASHBOARD} className="font-display text-3xl font-bold tracking-tight text-primary">
          {APP_NAME}
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>
      <div className="w-full max-w-md rounded-lg border bg-card/80 p-6 shadow-sm backdrop-blur">
        <Outlet />
      </div>
    </div>
  );
}
