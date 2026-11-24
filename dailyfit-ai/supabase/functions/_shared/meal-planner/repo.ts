// Supabase-backed implementation of PlannerRepo.
import type { SupabaseClient } from '@supabase/supabase-js';

import type { DietaryRestriction, FoodTag, MealType } from '../domain/constants.ts';
import type { MealPlanDTO } from '../domain/contracts.ts';
import type { FoodCandidate } from '../domain/planner.ts';
import { HttpError } from '../http.ts';
import type { Tier } from '../quota.ts';
import type { PlannerRepo, StoredProfile } from './service.ts';

const PLAN_SELECT = `id, plan_date, goal, budget_thb, meals_per_day, total_kcal, total_protein_g, total_carbs_g, total_fat_g,
  total_price_min_thb, total_price_max_thb, generated_by, summary_th, uses_sample_data,
  items:meal_plan_items(id, meal_type, position, serving_count, reason_th, kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb,
    food:food_items(id, name_th, name_en, category, serving_description_th, image_path, description_th, verification_status))`;

/**
 * `user` = caller-scoped client (RLS enforced) for reads.
 * `admin` = service role, used only for RPCs that are restricted to service_role.
 */
export function supabasePlannerRepo(user: SupabaseClient, admin: SupabaseClient): PlannerRepo {
  const must = <T>(r: { data: T | null; error: unknown }): T => {
    if (r.error || r.data === null) throw r.error ?? new Error('NO_DATA');
    return r.data;
  };

  return {
    async getProfile(userId): Promise<StoredProfile> {
      const [p, pref] = await Promise.all([
        user.from('profiles').select('birth_year, sex, height_cm, weight_kg, activity_level, goal, daily_budget_thb').eq('id', userId).single(),
        user.from('user_preferences').select('meals_per_day, liked_tags, excluded_tags, dietary_restrictions').eq('user_id', userId).single(),
      ]);
      const profile = must(p);
      const prefs = must(pref);
      return {
        birthYear: profile.birth_year,
        sex: profile.sex,
        heightCm: profile.height_cm === null ? null : Number(profile.height_cm),
        weightKg: profile.weight_kg === null ? null : Number(profile.weight_kg),
        activityLevel: profile.activity_level,
        goal: profile.goal,
        dailyBudgetThb: profile.daily_budget_thb,
        mealsPerDay: prefs.meals_per_day,
        likedTags: prefs.liked_tags as FoodTag[],
        excludedTags: prefs.excluded_tags as FoodTag[],
        restrictions: prefs.dietary_restrictions as DietaryRestriction[],
      };
    },

    async getTier(userId): Promise<Tier> {
      const r = await admin.rpc('effective_plan', { p_user_id: userId });
      return r.data === 'premium' ? 'premium' : 'free';
    },

    async getFoods(): Promise<FoodCandidate[]> {
      // RLS already limits rows to active verified/sample items.
      const rows = must(
        await user
          .from('food_items')
          .select('id, name_th, category, meal_types, tags, energy_kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb, verification_status')
          .limit(500),
      );
      return rows.map((r) => ({
        id: r.id,
        name_th: r.name_th,
        category: r.category,
        meal_types: r.meal_types as MealType[],
        tags: r.tags as FoodTag[],
        kcal: Number(r.energy_kcal),
        protein_g: Number(r.protein_g),
        carbs_g: Number(r.carbs_g),
        fat_g: Number(r.fat_g),
        price_min_thb: r.price_min_thb,
        price_max_thb: r.price_max_thb,
        verification_status: r.verification_status,
      }));
    },

    async consumeQuota(userId, feature, limit) {
      return must(await admin.rpc('consume_ai_quota', { p_user_id: userId, p_feature: feature, p_daily_limit: limit })) as number;
    },

    async recordUsage(userId, feature, inputTokens, outputTokens, costUsd) {
      await admin.rpc('record_ai_usage', {
        p_user_id: userId,
        p_feature: feature,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
        p_est_cost_usd: costUsd,
      });
    },

    async savePlan(userId, plan) {
      return must(await admin.rpc('save_meal_plan', { p_user_id: userId, p_plan: plan })) as string;
    },

    async getPlanItem(userId, itemId) {
      const r = await user
        .from('meal_plan_items')
        .select('meal_plan_id, food_item_id, meal_type, plan:meal_plans!inner(user_id, status)')
        .eq('id', itemId)
        .eq('plan.status', 'active')
        .maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) return null;
      return { meal_plan_id: r.data.meal_plan_id, food_item_id: r.data.food_item_id, meal_type: r.data.meal_type as MealType };
    },

    async getPlanFoodIds(planId) {
      const rows = must(await user.from('meal_plan_items').select('food_item_id').eq('meal_plan_id', planId));
      return rows.map((r) => r.food_item_id as string);
    },

    async swapItem(userId, itemId, foodId, reasonTh, allowSample) {
      const r = await admin.rpc('swap_meal_plan_item', {
        p_user_id: userId,
        p_item_id: itemId,
        p_food_item_id: foodId,
        p_reason_th: reasonTh,
        p_allow_sample: allowSample,
      });
      if (r.error) throw new HttpError('NOT_FOUND');
      return r.data as string;
    },

    async getPlan(planId) {
      const data = must(await user.from('meal_plans').select(PLAN_SELECT).eq('id', planId).single()) as unknown as MealPlanDTO;
      data.items.sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type) || a.position - b.position);
      return normalizeNumbers(data);
    },
  };
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** PostgREST returns numeric columns as strings in some cases; coerce once here. */
function normalizeNumbers(p: MealPlanDTO): MealPlanDTO {
  const n = (v: unknown) => Number(v);
  return {
    ...p,
    total_kcal: n(p.total_kcal),
    total_protein_g: n(p.total_protein_g),
    total_carbs_g: n(p.total_carbs_g),
    total_fat_g: n(p.total_fat_g),
    items: p.items.map((i) => ({
      ...i,
      serving_count: n(i.serving_count),
      kcal: n(i.kcal),
      protein_g: n(i.protein_g),
      carbs_g: n(i.carbs_g),
      fat_g: n(i.fat_g),
    })),
  };
}
