// API contracts between the mobile app and Edge Functions (single source of truth).
import { z } from 'zod';

import { DIETARY_RESTRICTIONS, FOOD_TAGS, GOALS, LIMITS, MEAL_TYPES } from './constants.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

// ---------------------------------------------------------------------------
// meal-planner
// ---------------------------------------------------------------------------
export const GenerateMealPlanRequest = z
  .object({
    action: z.literal('generate'),
    plan_date: isoDate,
    // Optional per-request overrides; defaults come from the stored profile/preferences.
    budget_thb: z.number().int().min(LIMITS.budgetMin).max(LIMITS.budgetMax).optional(),
    meals_per_day: z.number().int().min(2).max(4).optional(),
    goal: z.enum(GOALS).optional(),
    liked_tags: z.array(z.enum(FOOD_TAGS)).max(20).optional(),
    excluded_tags: z.array(z.enum(FOOD_TAGS)).max(20).optional(),
  })
  .strict();
export type GenerateMealPlanRequest = z.infer<typeof GenerateMealPlanRequest>;

export const SWAP_REASONS = ['dislike', 'cheaper', 'lighter', 'more_protein'] as const;
export const SwapMealRequest = z
  .object({
    action: z.literal('swap'),
    meal_plan_item_id: z.string().uuid(),
    reason: z.enum(SWAP_REASONS).default('dislike'),
  })
  .strict();
export type SwapMealRequest = z.infer<typeof SwapMealRequest>;

export const MealPlannerRequest = z.discriminatedUnion('action', [GenerateMealPlanRequest, SwapMealRequest]);
export type MealPlannerRequest = z.infer<typeof MealPlannerRequest>;

export interface MealPlanItemDTO {
  id: string;
  meal_type: (typeof MEAL_TYPES)[number];
  position: number;
  serving_count: number;
  reason_th: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  price_min_thb: number;
  price_max_thb: number;
  food: {
    id: string;
    name_th: string;
    name_en: string | null;
    category: string;
    serving_description_th: string;
    image_path: string | null;
    description_th: string | null;
    verification_status: 'verified' | 'sample';
  };
}

export interface MealPlanDTO {
  id: string;
  plan_date: string;
  goal: (typeof GOALS)[number];
  budget_thb: number;
  meals_per_day: number;
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_price_min_thb: number;
  total_price_max_thb: number;
  generated_by: 'ai' | 'fallback';
  summary_th: string | null;
  uses_sample_data: boolean;
  items: MealPlanItemDTO[];
}

export interface MealPlannerResponse {
  plan: MealPlanDTO;
  /** Always true: nutrition and prices are estimates from the food database. */
  is_estimate: true;
  quota: { used: number; limit: number };
}

// ---------------------------------------------------------------------------
// ai-coach
// ---------------------------------------------------------------------------
export const CoachRequest = z
  .object({
    conversation_id: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(LIMITS.coachMessageMaxChars),
  })
  .strict();
export type CoachRequest = z.infer<typeof CoachRequest>;

export interface CoachResponse {
  conversation_id: string;
  reply: { id: string; content: string; created_at: string };
  quota: { used: number; limit: number };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'VALIDATION',
  'QUOTA_EXCEEDED',
  'INSUFFICIENT_FOOD_DATA',
  'NOT_FOUND',
  'AI_UNAVAILABLE',
  'METHOD_NOT_ALLOWED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; request_id: string };
}

export const DietaryRestrictionSchema = z.enum(DIETARY_RESTRICTIONS);
