import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MealType } from '@shared/constants';

import { computeWeeklyProgress, lastNDates } from '@/domain/progress';
import { useAuth } from '@/providers/AuthProvider';
import { addLog, deleteLog, listLogs, type NewLog, updateLog } from '@/services/foodLogs';
import { getFood, listFoods } from '@/services/foods';
import { getActivePlan } from '@/services/mealPlans';

export function useFoods() {
  return useQuery({ queryKey: ['foods'], queryFn: listFoods, staleTime: 10 * 60_000 });
}

export function useFood(id: string | undefined) {
  return useQuery({ queryKey: ['food', id], queryFn: () => getFood(id!), enabled: !!id });
}

export function useDayLogs(date: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['logs', user?.id, date], queryFn: () => listLogs(date, date), enabled: !!user });
}

function useInvalidateLogs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => {
    qc.invalidateQueries({ queryKey: ['logs', user?.id] });
    qc.invalidateQueries({ queryKey: ['progress', user?.id] });
  };
}

export function useAddLog() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: (v: NewLog) => addLog(v), onSuccess: invalidate });
}

export function useUpdateLog() {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: (v: { id: string; servingCount?: number; mealType?: MealType }) => updateLog(v.id, v),
    onSuccess: invalidate,
  });
}

export function useDeleteLog() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: (id: string) => deleteLog(id), onSuccess: invalidate });
}

export function useWeeklyProgress(today: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['progress', user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const dates = lastNDates(today, 7);
      const [logs, plans] = await Promise.all([
        listLogs(dates[0]!, today),
        Promise.all(dates.map((d) => getActivePlan(d))),
      ]);
      const planned = Object.fromEntries(dates.map((d, i) => [d, plans[i]?.items.length ?? 0]));
      return computeWeeklyProgress(today, logs, planned);
    },
  });
}
