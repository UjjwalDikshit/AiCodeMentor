import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardService,
  progressService,
  goalsService,
  activityService,
  achievementsService,
  notificationsService,
  analyticsService,
} from '../services';

export const dashboardKeys = {
  all: ['dashboard'],
  progress: ['progress'],
  goals: ['goals'],
  activity: ['activity'],
  achievements: ['achievements'],
  notifications: ['notifications'],
  analytics: ['analytics'],
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: async () => {
      const { data } = await dashboardService.getOverview();
      return data.data;
    },
  });
}

export function useProgress() {
  return useQuery({
    queryKey: dashboardKeys.progress,
    queryFn: async () => {
      const { data } = await progressService.get();
      return data.data.progress;
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => progressService.update(payload).then((r) => r.data),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: dashboardKeys.progress });
      const previous = qc.getQueryData(dashboardKeys.progress);
      qc.setQueryData(dashboardKeys.progress, (old) => (old ? { ...old, ...payload } : old));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(dashboardKeys.progress, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.progress });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useGoals(params) {
  return useQuery({
    queryKey: [...dashboardKeys.goals, params],
    queryFn: async () => {
      const { data } = await goalsService.list(params);
      return data.data.dailyGoals;
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => goalsService.create(payload).then((r) => r.data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.goals });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.activity });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => goalsService.update(id, payload).then((r) => r.data),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: dashboardKeys.goals });
      const previous = qc.getQueryData(dashboardKeys.goals);
      qc.setQueriesData({ queryKey: dashboardKeys.goals }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((day) => ({
          ...day,
          goals: day.goals?.map((g) => (g._id === id ? { ...g, completed } : g)),
        }));
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(dashboardKeys.goals, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.goals });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.progress });
      qc.invalidateQueries({ queryKey: dashboardKeys.activity });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => goalsService.remove(id).then((r) => r.data),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: dashboardKeys.goals });
      qc.setQueriesData({ queryKey: dashboardKeys.goals }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((day) => ({
          ...day,
          goals: day.goals?.filter((g) => g._id !== id),
        }));
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.goals });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useActivity(filters = {}) {
  return useInfiniteQuery({
    queryKey: [...dashboardKeys.activity, filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await activityService.list({ ...filters, page: pageParam, limit: 15 });
      return { activities: data.data.activities, meta: data.meta };
    },
    getNextPageParam: (last) => (last.meta?.hasMore ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: dashboardKeys.achievements,
    queryFn: async () => {
      const { data } = await achievementsService.list();
      return data.data;
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: dashboardKeys.notifications,
    queryFn: async () => {
      // Backend ready; fall back to empty if unavailable
      try {
        const { data } = await notificationsService.list({ page: 1, limit: 10 });
        return {
          notifications: data.data.notifications,
          meta: data.meta,
        };
      } catch {
        return {
          notifications: [
            {
              _id: 'dummy-1',
              title: 'Welcome',
              message: 'Notifications API is ready — showing placeholder.',
              type: 'info',
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { unreadCount: 1 },
        };
      }
    },
    refetchInterval: 60_000,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: dashboardKeys.analytics,
    queryFn: async () => {
      const { data } = await analyticsService.get();
      return data.data;
    },
  });
}
