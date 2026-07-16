import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ROUTES } from '../constants';

export default function RegisterPage() {
  function handleSubmit(e) {
    e.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Create account</h1>
      <p className="text-sm text-muted-foreground">Placeholder register — Coming Soon.</p>
      <Input type="text" placeholder="Full name" />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Button type="submit" className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
