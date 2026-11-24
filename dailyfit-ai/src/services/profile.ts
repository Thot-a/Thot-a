import type { ActivityLevel, DietaryRestriction, FoodTag, Goal, Sex } from '@shared/constants';

import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  displayName: string | null;
  birthYear: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal;
  activityLevel: ActivityLevel;
  dailyBudgetThb: number;
  onboardingCompletedAt: string | null;
  mealsPerDay: number;
  likedTags: FoodTag[];
  excludedTags: FoodTag[];
  restrictions: DietaryRestriction[];
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session) throw toAppError({ status: 401 });
  return data.session.user.id;
}

export async function getMyProfile(): Promise<Profile> {
  const sb = requireSupabase();
  const id = await currentUserId();
  const [p, pref] = await Promise.all([
    sb
      .from('profiles')
      .select('id, display_name, birth_year, sex, height_cm, weight_kg, goal, activity_level, daily_budget_thb, onboarding_completed_at')
      .eq('id', id)
      .single(),
    sb.from('user_preferences').select('meals_per_day, liked_tags, excluded_tags, dietary_restrictions').eq('user_id', id).single(),
  ]);
  if (p.error) throw toAppError(p.error);
  if (pref.error) throw toAppError(pref.error);
  return {
    id: p.data.id,
    displayName: p.data.display_name,
    birthYear: p.data.birth_year,
    sex: p.data.sex,
    heightCm: p.data.height_cm === null ? null : Number(p.data.height_cm),
    weightKg: p.data.weight_kg === null ? null : Number(p.data.weight_kg),
    goal: p.data.goal,
    activityLevel: p.data.activity_level,
    dailyBudgetThb: p.data.daily_budget_thb,
    onboardingCompletedAt: p.data.onboarding_completed_at,
    mealsPerDay: pref.data.meals_per_day,
    likedTags: pref.data.liked_tags,
    excludedTags: pref.data.excluded_tags,
    restrictions: pref.data.dietary_restrictions,
  };
}

export interface ProfileUpdate {
  displayName?: string;
  birthYear?: number | null;
  sex?: Sex | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: Goal;
  activityLevel?: ActivityLevel;
  dailyBudgetThb?: number;
  onboardingCompleted?: boolean;
}

export async function updateProfile(u: ProfileUpdate): Promise<void> {
  const id = await currentUserId();
  const row: Record<string, unknown> = {};
  if (u.displayName !== undefined) row.display_name = u.displayName;
  if (u.birthYear !== undefined) row.birth_year = u.birthYear;
  if (u.sex !== undefined) row.sex = u.sex;
  if (u.heightCm !== undefined) row.height_cm = u.heightCm;
  if (u.weightKg !== undefined) row.weight_kg = u.weightKg;
  if (u.goal !== undefined) row.goal = u.goal;
  if (u.activityLevel !== undefined) row.activity_level = u.activityLevel;
  if (u.dailyBudgetThb !== undefined) row.daily_budget_thb = u.dailyBudgetThb;
  if (u.onboardingCompleted) row.onboarding_completed_at = new Date().toISOString();
  const { error } = await requireSupabase().from('profiles').update(row).eq('id', id);
  if (error) throw toAppError(error);
}

export interface PreferencesUpdate {
  mealsPerDay?: number;
  likedTags?: FoodTag[];
  excludedTags?: FoodTag[];
  restrictions?: DietaryRestriction[];
}

export async function updatePreferences(u: PreferencesUpdate): Promise<void> {
  const id = await currentUserId();
  const row: Record<string, unknown> = {};
  if (u.mealsPerDay !== undefined) row.meals_per_day = u.mealsPerDay;
  if (u.likedTags !== undefined) row.liked_tags = u.likedTags;
  if (u.excludedTags !== undefined) row.excluded_tags = u.excludedTags;
  if (u.restrictions !== undefined) row.dietary_restrictions = u.restrictions;
  const { error } = await requireSupabase().from('user_preferences').update(row).eq('user_id', id);
  if (error) throw toAppError(error);
}
