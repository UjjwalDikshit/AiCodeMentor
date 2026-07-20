import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useRestoreGoal,
  useUpdateGoal,
} from '../hooks/useDashboard';
import { PageSkeleton } from '../components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function GoalsPage() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: dailyGoals, isLoading, isError, refetch } = useGoals({
    includeDeleted: showDeleted ? 'true' : undefined,
  });
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const restoreGoal = useRestoreGoal();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('medium');

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const today = dailyGoals?.[0];
  const goals = today?.goals || [];
  const deletedGoals = today?.deletedGoals || [];

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

  function startEdit(goal) {
    setEditingId(goal._id);
    setEditTitle(goal.title);
    setEditPriority(goal.priority || 'medium');
  }

  async function saveEdit(goalId) {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await updateGoal.mutateAsync({
        id: goalId,
        title: editTitle.trim(),
        priority: editPriority,
      });
      setEditingId(null);
      toast.success('Goal updated');
    } catch {
      toast.error('Failed to update goal');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Create, edit, complete, soft-delete, and restore</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show deleted
        </label>
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
            <div key={goal._id} className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center">
              <input
                type="checkbox"
                checked={goal.completed}
                aria-label={`Mark ${goal.title} complete`}
                onChange={() =>
                  updateGoal.mutate(
                    { id: goal._id, completed: !goal.completed },
                    { onError: () => toast.error('Failed to update goal') }
                  )
                }
              />
              <div className="flex-1 min-w-0 space-y-2">
                {editingId === goal._id ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      aria-label="Edit goal title"
                    />
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      aria-label="Edit priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <Button type="button" size="sm" onClick={() => saveEdit(goal._id)}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {goal.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{goal.priority}</p>
                  </>
                )}
              </div>
              {editingId !== goal._id && (
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => startEdit(goal)}
                  >
                    Edit
                  </button>
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
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {showDeleted && (
        <Card>
          <CardHeader>
            <CardTitle>Deleted goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deletedGoals.length === 0 && (
              <p className="text-sm text-muted-foreground">No deleted goals today.</p>
            )}
            {deletedGoals.map((goal) => (
              <div key={goal._id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm text-muted-foreground line-through">{goal.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{goal.priority}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() =>
                    restoreGoal.mutate(goal._id, {
                      onSuccess: () => toast.success('Goal restored'),
                      onError: () => toast.error('Restore failed'),
                    })
                  }
                >
                  Restore
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
