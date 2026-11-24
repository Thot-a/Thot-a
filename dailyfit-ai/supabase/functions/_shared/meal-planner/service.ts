// Meal-planner orchestration. All I/O is injected so it can be tested without Supabase or an AI provider.
import type { AIProvider } from '../ai/provider.ts';
import { AIError, estimateCostUsd } from '../ai/provider.ts';
import type { DietaryRestriction, FoodTag, Goal } from '../domain/constants.ts';
import type { GenerateMealPlanRequest, MealPlanDTO, MealPlannerResponse, SwapMealRequest } from '../domain/contracts.ts';
import { computeDailyTargets, mealTypesFor, type NutritionProfile } from '../domain/nutrition.ts';
import {
  AI_PLAN_JSON_SCHEMA,
  buildCandidateIndex,
  buildPlannerUserPrompt,
  deterministicPlan,
  type FoodCandidate,
  filterCandidates,
  missingMealCoverage,
  type PlanContext,
  type PlannedItem,
  PLANNER_SYSTEM_PROMPT,
  pickSwap,
  resolveExcludedTags,
  seededUnit,
  validateAIPlan,
} from '../domain/planner.ts';
import { HttpError, log } from '../http.ts';
import { DAILY_QUOTA, type Feature, type Tier } from '../quota.ts';

export interface StoredProfile extends NutritionProfile {
  dailyBudgetThb: number;
  mealsPerDay: number;
  likedTags: FoodTag[];
  excludedTags: FoodTag[];
  restrictions: DietaryRestriction[];
}

export interface PlannerRepo {
  getProfile(userId: string): Promise<StoredProfile>;
  getTier(userId: string): Promise<Tier>;
  getFoods(): Promise<FoodCandidate[]>;
  /** Returns new count, or -1 when the limit is reached. */
  consumeQuota(userId: string, feature: Feature, limit: number): Promise<number>;
  recordUsage(userId: string, feature: Feature, inputTokens: number, outputTokens: number, costUsd: number): Promise<void>;
  savePlan(userId: string, plan: SavePlanPayload): Promise<string>;
  getPlanItem(userId: string, itemId: string): Promise<{ meal_plan_id: string; food_item_id: string; meal_type: PlannedItem['meal_type'] } | null>;
  getPlanFoodIds(planId: string): Promise<string[]>;
  swapItem(userId: string, itemId: string, foodId: string, reasonTh: string, allowSample: boolean): Promise<string>;
  getPlan(planId: string): Promise<MealPlanDTO>;
}

export interface SavePlanPayload {
  plan_date: string;
  goal: Goal;
  budget_thb: number;
  meals_per_day: number;
  generated_by: 'ai' | 'fallback';
  summary_th: string;
  ai_model: string | null;
  allow_sample: boolean;
  items: PlannedItem[];
}

export interface PlannerDeps {
  repo: PlannerRepo;
  /** null when AI is not configured — the deterministic planner is used. */
  ai: { provider: AIProvider; model: string; timeoutMs: number } | null;
  allowSample: boolean;
  requestId: string;
  now?: Date;
}

/** Keeps prompts small: at most this many candidates are sent to the model. */
export const MAX_PROMPT_CANDIDATES = 45;
const AI_ATTEMPTS = 2;

const FALLBACK_SUMMARY = 'แผนนี้จัดจากงบประมาณและความชอบของคุณ ตัวเลขทั้งหมดเป็นค่าประมาณจากฐานข้อมูลเมนู';

export async function generatePlan(userId: string, req: GenerateMealPlanRequest, deps: PlannerDeps): Promise<MealPlannerResponse> {
  const { repo } = deps;
  const [profile, tier, foods] = await Promise.all([repo.getProfile(userId), repo.getTier(userId), repo.getFoods()]);

  const mealTypes = mealTypesFor(req.meals_per_day ?? profile.mealsPerDay);
  const budgetThb = req.budget_thb ?? profile.dailyBudgetThb;
  const goal = req.goal ?? profile.goal;
  const excludedTags = resolveExcludedTags(req.excluded_tags ?? profile.excludedTags, profile.restrictions);
  const likedTags = req.liked_tags ?? profile.likedTags;

  const candidates = filterCandidates(foods, { excludedTags, budgetThb, mealTypes, allowSample: deps.allowSample });
  const missing = missingMealCoverage(candidates, mealTypes);
  if (missing.length) {
    // Never invent food or nutrition data to fill the gap.
    throw new HttpError('INSUFFICIENT_FOOD_DATA', `Not enough verified menu options for: ${missing.join(', ')}`);
  }

  const limit = DAILY_QUOTA[tier].meal_plan;
  const used = await repo.consumeQuota(userId, 'meal_plan', limit);
  if (used < 0) throw new HttpError('QUOTA_EXCEEDED');

  const ctx: PlanContext = {
    goal,
    budgetThb,
    mealTypes,
    targets: computeDailyTargets({ ...profile, goal }, deps.now),
    likedTags,
    excludedTags,
    seed: `${userId}:${req.plan_date}:${used}`,
  };

  let items: PlannedItem[] | null = null;
  let summary = FALLBACK_SUMMARY;
  let aiModel: string | null = null;

  if (deps.ai) {
    const promptCandidates = selectPromptCandidates(candidates, ctx);
    const index = buildCandidateIndex(promptCandidates);
    let inTok = 0;
    let outTok = 0;
    for (let attempt = 1; attempt <= AI_ATTEMPTS && !items; attempt++) {
      try {
        const r = await deps.ai.provider.generateJSON({
          model: deps.ai.model,
          system: PLANNER_SYSTEM_PROMPT,
          user: buildPlannerUserPrompt(ctx, index),
          jsonSchema: AI_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
          maxTokens: 1500,
          timeoutMs: deps.ai.timeoutMs,
        });
        inTok += r.usage.inputTokens;
        outTok += r.usage.outputTokens;
        const v = validateAIPlan(r.value, ctx, index);
        if (v.ok) {
          items = v.items;
          summary = v.summary;
          aiModel = r.model;
        } else {
          log('warn', 'planner_ai_invalid', { request_id: deps.requestId, attempt, reason: v.reason });
        }
      } catch (e) {
        const kind = e instanceof AIError ? e.kind : 'unknown';
        log('warn', 'planner_ai_error', { request_id: deps.requestId, attempt, kind });
        if (kind === 'config' || kind === 'refused') break; // retrying won't help
      }
    }
    if (inTok || outTok) {
      await repo.recordUsage(userId, 'meal_plan', inTok, outTok, estimateCostUsd(deps.ai.model, { inputTokens: inTok, outputTokens: outTok }));
    }
  }

  const generatedBy: 'ai' | 'fallback' = items ? 'ai' : 'fallback';
  if (!items) items = deterministicPlan(candidates, ctx);

  const planId = await repo.savePlan(userId, {
    plan_date: req.plan_date,
    goal,
    budget_thb: budgetThb,
    meals_per_day: mealTypes.length,
    generated_by: generatedBy,
    summary_th: summary,
    ai_model: aiModel,
    allow_sample: deps.allowSample,
    items,
  });

  return { plan: await repo.getPlan(planId), is_estimate: true, quota: { used, limit } };
}

/** Swaps are rule-based (no AI cost): filter by the same constraints and pick by reason. */
export async function swapMeal(userId: string, req: SwapMealRequest, deps: PlannerDeps): Promise<MealPlannerResponse> {
  const { repo } = deps;
  const item = await repo.getPlanItem(userId, req.meal_plan_item_id);
  if (!item) throw new HttpError('NOT_FOUND');

  const [profile, tier, foods, planFoodIds] = await Promise.all([
    repo.getProfile(userId),
    repo.getTier(userId),
    repo.getFoods(),
    repo.getPlanFoodIds(item.meal_plan_id),
  ]);
  const excludedTags = resolveExcludedTags(profile.excludedTags, profile.restrictions);
  const candidates = filterCandidates(foods, {
    excludedTags,
    budgetThb: profile.dailyBudgetThb,
    mealTypes: [item.meal_type],
    allowSample: deps.allowSample,
  });
  // Keep the current food in the pool so "cheaper/lighter" can compare against it.
  const current = foods.find((f) => f.id === item.food_item_id);
  const pool = current && !candidates.includes(current) ? [...candidates, current] : candidates;

  const limit = DAILY_QUOTA[tier].meal_swap;
  const used = await repo.consumeQuota(userId, 'meal_swap', limit);
  if (used < 0) throw new HttpError('QUOTA_EXCEEDED');

  const choice = pickSwap(pool, item, planFoodIds, req.reason, `${userId}:${req.meal_plan_item_id}:${used}`);
  if (!choice) throw new HttpError('INSUFFICIENT_FOOD_DATA', 'No alternative menu matches this request');

  const reasonTh: Record<SwapMealRequest['reason'], string> = {
    dislike: 'ตัวเลือกใหม่ที่เหมาะกับมื้อนี้',
    cheaper: 'ราคาประหยัดกว่าเมนูเดิม',
    lighter: 'พลังงานเบากว่าเมนูเดิม',
    more_protein: 'โปรตีนมากกว่าเมนูเดิม',
  };
  const planId = await repo.swapItem(userId, req.meal_plan_item_id, choice.id, reasonTh[req.reason], deps.allowSample);
  return { plan: await repo.getPlan(planId), is_estimate: true, quota: { used, limit } };
}

/** Deterministically trims the candidate list per meal type to bound prompt size. */
export function selectPromptCandidates(candidates: readonly FoodCandidate[], ctx: PlanContext): FoodCandidate[] {
  if (candidates.length <= MAX_PROMPT_CANDIDATES) return [...candidates];
  const perMeal = Math.max(MIN_PER_MEAL, Math.floor(MAX_PROMPT_CANDIDATES / ctx.mealTypes.length));
  const chosen = new Map<string, FoodCandidate>();
  for (const m of ctx.mealTypes) {
    candidates
      .filter((c) => c.meal_types.includes(m))
      .sort((a, b) => seededUnit(`${ctx.seed}:${a.id}`) - seededUnit(`${ctx.seed}:${b.id}`))
      .slice(0, perMeal)
      .forEach((c) => chosen.set(c.id, c));
  }
  return [...chosen.values()].slice(0, MAX_PROMPT_CANDIDATES);
}
const MIN_PER_MEAL = 6;
