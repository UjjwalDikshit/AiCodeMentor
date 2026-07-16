import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';

/** Placeholder guard — currently allows all traffic so pages are browsable. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  // Soft placeholder: do not hard-block while auth is Coming Soon
  if (!isAuthenticated && import.meta.env.VITE_ENFORCE_AUTH === 'true') {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children ? children : <Outlet />;
}
