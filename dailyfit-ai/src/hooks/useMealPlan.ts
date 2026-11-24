import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';
import { generatePlan, getActivePlan, swapMeal } from '@/services/mealPlans';

export const planKey = (userId: string | undefined, date: string) => ['meal-plan', userId, date] as const;

export function useActivePlan(date: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: planKey(session?.user.id, date),
    queryFn: () => getActivePlan(date),
    enabled: !!session,
  });
}

export function useGeneratePlan(date: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: () => generatePlan(date),
    onSuccess: (r) => qc.setQueryData(planKey(session?.user.id, date), r.plan),
  });
}

export function useSwapMeal(date: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (v: { itemId: string; reason: 'dislike' | 'cheaper' | 'lighter' | 'more_protein' }) => swapMeal(v.itemId, v.reason),
    onSuccess: (r) => qc.setQueryData(planKey(session?.user.id, date), r.plan),
  });
}
