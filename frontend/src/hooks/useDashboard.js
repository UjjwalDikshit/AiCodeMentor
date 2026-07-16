import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';

/** Example React Query hook — domain hooks live here. */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await dashboardService.getOverview();
      return data;
    },
  });
}
