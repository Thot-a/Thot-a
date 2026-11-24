import type { MealPlanDTO, MealPlannerResponse } from '@shared/contracts';

import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

import { invokeFunction } from './functions';

const PLAN_SELECT = `id, plan_date, goal, budget_thb, meals_per_day, total_kcal, total_protein_g, total_carbs_g, total_fat_g,
  total_price_min_thb, total_price_max_thb, generated_by, summary_th, uses_sample_data,
  items:meal_plan_items(id, meal_type, position, serving_count, reason_th, kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb,
    food:food_items(id, name_th, name_en, category, serving_description_th, image_path, description_th, verification_status))`;

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export function normalizePlan(p: MealPlanDTO): MealPlanDTO {
  const n = Number;
  return {
    ...p,
    total_kcal: n(p.total_kcal),
    total_protein_g: n(p.total_protein_g),
    total_carbs_g: n(p.total_carbs_g),
    total_fat_g: n(p.total_fat_g),
    items: [...p.items]
      .map((i) => ({ ...i, serving_count: n(i.serving_count), kcal: n(i.kcal), protein_g: n(i.protein_g), carbs_g: n(i.carbs_g), fat_g: n(i.fat_g) }))
      .sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type) || a.position - b.position),
  };
}

/** Today's active plan, or null if none yet. */
export async function getActivePlan(planDate: string): Promise<MealPlanDTO | null> {
  const { data, error } = await requireSupabase()
    .from('meal_plans')
    .select(PLAN_SELECT)
    .eq('plan_date', planDate)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? normalizePlan(data as unknown as MealPlanDTO) : null;
}

export async function generatePlan(planDate: string): Promise<MealPlannerResponse> {
  const r = await invokeFunction<MealPlannerResponse>('meal-planner', { action: 'generate', plan_date: planDate });
  return { ...r, plan: normalizePlan(r.plan) };
}

export async function swapMeal(itemId: string, reason: 'dislike' | 'cheaper' | 'lighter' | 'more_protein'): Promise<MealPlannerResponse> {
  const r = await invokeFunction<MealPlannerResponse>('meal-planner', { action: 'swap', meal_plan_item_id: itemId, reason });
  return { ...r, plan: normalizePlan(r.plan) };
}
