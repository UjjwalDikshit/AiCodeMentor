import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ROUTES } from '../constants';

/** UI placeholder — email reset flow not implemented yet. */
export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>
            Password reset via email is coming soon. This page is a UI placeholder only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="you@example.com" disabled />
          <Button className="w-full" disabled>
            Send reset link (Coming Soon)
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to={ROUTES.LOGIN} className="text-primary hover:underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
