import { Link } from 'react-router-dom';
import { ROUTES } from '../constants';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        This route does not exist in CodeMentor AI. Head back to the dashboard.
      </p>
      <Link
        to={ROUTES.DASHBOARD}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
