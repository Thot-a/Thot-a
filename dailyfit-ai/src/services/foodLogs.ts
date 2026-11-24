import type { MealType } from '@shared/constants';

import { demoLogs } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import type { FoodLog } from '@/types/models';

const LOG_SELECT = `id, log_date, meal_type, serving_count, kcal, protein_g, carbs_g, fat_g, meal_plan_item_id, created_at,
  food:food_items(id, name_th, category, image_path, serving_description_th, price_min_thb, price_max_thb)`;

const normalize = (l: FoodLog): FoodLog => ({
  ...l,
  serving_count: Number(l.serving_count),
  kcal: Number(l.kcal),
  protein_g: Number(l.protein_g),
  carbs_g: Number(l.carbs_g),
  fat_g: Number(l.fat_g),
});

export async function listLogs(from: string, to: string): Promise<FoodLog[]> {
  if (DEMO_MODE) return demoLogs.listRange(from, to);
  const { data, error } = await requireSupabase()
    .from('food_logs')
    .select(LOG_SELECT)
    .gte('log_date', from)
    .lte('log_date', to)
    .order('created_at');
  if (error) throw toAppError(error);
  return (data as unknown as FoodLog[]).map(normalize);
}

export interface NewLog {
  foodId: string;
  date: string;
  mealType: MealType;
  servingCount: number;
  mealPlanItemId?: string | null;
}

/** Nutrition snapshot is computed by the database trigger; the client only sends ids and servings. */
export async function addLog(v: NewLog): Promise<void> {
  if (DEMO_MODE) {
    await demoLogs.add(v);
    return;
  }
  const { error } = await requireSupabase().from('food_logs').insert({
    food_item_id: v.foodId,
    log_date: v.date,
    meal_type: v.mealType,
    serving_count: v.servingCount,
    meal_plan_item_id: v.mealPlanItemId ?? null,
  });
  if (error) throw toAppError(error);
}

export async function updateLog(id: string, v: { servingCount?: number; mealType?: MealType }): Promise<void> {
  if (DEMO_MODE) return demoLogs.update(id, v);
  const row: Record<string, unknown> = {};
  if (v.servingCount !== undefined) row.serving_count = v.servingCount;
  if (v.mealType !== undefined) row.meal_type = v.mealType;
  const { error } = await requireSupabase().from('food_logs').update(row).eq('id', id);
  if (error) throw toAppError(error);
}

export async function deleteLog(id: string): Promise<void> {
  if (DEMO_MODE) return demoLogs.remove(id);
  const { error } = await requireSupabase().from('food_logs').delete().eq('id', id);
  if (error) throw toAppError(error);
}
