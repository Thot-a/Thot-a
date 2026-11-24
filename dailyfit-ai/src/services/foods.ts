import { demoFoods } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import type { FoodItem } from '@/types/models';

const FOOD_SELECT =
  'id, name_th, name_en, category, serving_description_th, meal_types, tags, energy_kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb, image_path, verification_status';

type FoodRow = Omit<FoodItem, 'kcal'> & { energy_kcal: number | string };

const toFood = (r: FoodRow): FoodItem => ({
  ...r,
  kcal: Number(r.energy_kcal),
  protein_g: Number(r.protein_g),
  carbs_g: Number(r.carbs_g),
  fat_g: Number(r.fat_g),
});

/** Usable foods only (RLS returns verified items; sample items exist only in dev/staging). */
export async function listFoods(): Promise<FoodItem[]> {
  if (DEMO_MODE) return demoFoods.list();
  const { data, error } = await requireSupabase().from('food_items').select(FOOD_SELECT).order('name_th').limit(500);
  if (error) throw toAppError(error);
  return (data as FoodRow[]).map(toFood);
}

export async function getFood(id: string): Promise<FoodItem | null> {
  if (DEMO_MODE) return demoFoods.get(id);
  const { data, error } = await requireSupabase().from('food_items').select(FOOD_SELECT).eq('id', id).maybeSingle();
  if (error) throw toAppError(error);
  return data ? toFood(data as FoodRow) : null;
}

/** Public URL for a food photo in the `food-images` Storage bucket. */
export function foodImageUrl(path: string | null): string | null {
  if (!path || DEMO_MODE) return null;
  return requireSupabase().storage.from('food-images').getPublicUrl(path).data.publicUrl;
}
