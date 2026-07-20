import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function GoalsPage() {
  const { data: dailyGoals, isLoading, isError, refetch } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const today = dailyGoals?.[0];
  const goals = today?.goals || [];

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createGoal.mutateAsync({ title: title.trim(), priority });
      setTitle('');
      toast.success('Goal created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Goals</h1>
        <p className="text-muted-foreground">Daily goals with soft delete and optimistic updates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add goal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solve 2 graph problems"
              aria-label="Goal title"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Button type="submit" disabled={createGoal.isPending}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Today · {today?.completionPercentage ?? 0}% · {today?.status || 'pending'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {goals.length === 0 && (
            <EmptyState title="No goals for today" description="Add your first goal above." />
          )}
          {goals.map((goal) => (
            <div key={goal._id} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <input
                type="checkbox"
                checked={goal.completed}
                aria-label={`Mark ${goal.title} complete`}
                onChange={() =>
                  updateGoal.mutate(
                    { id: goal._id, completed: !goal.completed },
                    {
                      onError: () => toast.error('Failed to update goal'),
                    }
                  )
                }
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {goal.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{goal.priority}</p>
              </div>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() =>
                  deleteGoal.mutate(goal._id, {
                    onSuccess: () => toast.success('Goal removed'),
                    onError: () => toast.error('Delete failed'),
                  })
                }
              >
                Delete
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {(dailyGoals || []).slice(1).map((day) => (
        <Card key={day._id}>
          <CardHeader>
            <CardTitle className="text-base">
              {new Date(day.date).toLocaleDateString()} · {day.completionPercentage}%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(day.goals || []).map((g) => (
              <p key={g._id} className="text-sm text-muted-foreground">
                {g.completed ? '✓' : '○'} {g.title}
              </p>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
