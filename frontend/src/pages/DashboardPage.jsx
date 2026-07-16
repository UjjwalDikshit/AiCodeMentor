import { Link } from 'react-router-dom';
import { Flame, Target, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { PageSkeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { ROUTES } from '../constants';
import { getAvatarUrl } from '../utils/avatar';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { data: profile, isLoading } = useProfile();

  const user = profile || currentUser;
  const avatarUrl = getAvatarUrl(user?.avatar);

  if (isLoading && !user) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name} className="h-14 w-14 rounded-full object-cover border" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Coach'}
            </h1>
            <p className="text-muted-foreground">Your personal AI software engineering coach</p>
          </div>
        </div>
        <Link
          to={ROUTES.PROFILE}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-transparent px-4 text-sm font-medium hover:bg-secondary"
        >
          View profile
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Day streak"
          value={user?.streak ?? 0}
          hint="Keep showing up daily"
        />
        <StatCard
          icon={Target}
          label="Current goal"
          value={user?.currentGoal ? 'Set' : '—'}
          hint={user?.currentGoal || 'Define your target role'}
          smallValue
        />
        <StatCard icon={TrendingUp} label="Progress" value="—" hint="Analytics coming soon" />
        <StatCard
          icon={User}
          label="Account"
          value={user?.isVerified ? 'Verified' : 'Unverified'}
          hint={`Role: ${user?.role || 'user'}`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into coaching workflows</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { to: ROUTES.AI_CHAT, label: 'AI Chat' },
              { to: ROUTES.INTERVIEW, label: 'Mock interview' },
              { to: ROUTES.RESUME_REVIEW, label: 'Resume review' },
              { to: ROUTES.PLANNER, label: 'Study planner' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md border px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coaching focus</CardTitle>
            <CardDescription>Your north star for this sprint</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {user?.currentGoal ||
                'Set a goal on your profile — e.g. "Pass system design rounds at top-tier companies."'}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, smallValue }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className={`mt-2 font-bold text-primary ${smallValue ? 'text-lg' : 'text-3xl'}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{hint}</p>
      </CardContent>
    </Card>
  );
}
