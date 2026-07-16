import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    await login({ email: 'demo@codementor.ai', password: 'placeholder' });
    navigate(ROUTES.DASHBOARD);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted-foreground">Placeholder login — JWT wiring comes later.</p>
      <Input type="email" placeholder="Email" defaultValue="demo@codementor.ai" />
      <Input type="password" placeholder="Password" defaultValue="••••••••" />
      <Button type="submit" className="w-full">
        Continue
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link to={ROUTES.REGISTER} className="text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
