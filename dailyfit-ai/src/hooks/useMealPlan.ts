import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';
import { generatePlan, getActivePlan, type PlanOverrides, swapMeal, type SwapReason } from '@/services/mealPlans';

export const planKey = (userId: string | undefined, date: string) => ['meal-plan', userId, date] as const;

export function useActivePlan(date: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: planKey(user?.id, date), queryFn: () => getActivePlan(date), enabled: !!user });
}

export function useGeneratePlan(date: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (o: PlanOverrides | void) => generatePlan(date, o ?? {}),
    onSuccess: (r) => {
      qc.setQueryData(planKey(user?.id, date), r.plan);
      qc.invalidateQueries({ queryKey: ['progress', user?.id] });
    },
  });
}

export function useSwapMeal(date: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (v: { itemId: string; reason: SwapReason }) => swapMeal(date, v.itemId, v.reason),
    onSuccess: (r) => qc.setQueryData(planKey(user?.id, date), r.plan),
  });
}
