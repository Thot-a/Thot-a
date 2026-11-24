// Run: npm run test:functions
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { AIError, type AIProvider } from '../ai/provider.ts';
import type { MealPlanDTO } from '../domain/contracts.ts';
import type { FoodCandidate } from '../domain/planner.ts';
import { HttpError } from '../http.ts';
import { generatePlan, type PlannerDeps, type PlannerRepo, type SavePlanPayload, swapMeal } from './service.ts';

const food = (id: string, meal_types: FoodCandidate['meal_types'], over: Partial<FoodCandidate> = {}): FoodCandidate => ({
  id, name_th: id, category: 'rice_dish', meal_types, tags: [], kcal: 400, protein_g: 20, carbs_g: 50, fat_g: 10,
  price_min_thb: 30, price_max_thb: 40, verification_status: 'verified', ...over,
});

const FOODS = [
  food('b1', ['breakfast']), food('b2', ['breakfast']),
  food('l1', ['lunch', 'dinner']), food('l2', ['lunch', 'dinner']), food('l3', ['lunch', 'dinner'], { tags: ['pork'] }),
  food('d1', ['dinner']),
];

function fakeRepo(over: Partial<PlannerRepo> = {}) {
  const saved: SavePlanPayload[] = [];
  const usage: number[] = [];
  let quotaCalls = 0;
  const repo: PlannerRepo = {
    getProfile: () => Promise.resolve({
      birthYear: 1994, sex: 'female', heightCm: 160, weightKg: 55, activityLevel: 'light', goal: 'healthy_lifestyle',
      dailyBudgetThb: 150, mealsPerDay: 3, likedTags: [], excludedTags: [], restrictions: ['no_pork'],
    }),
    getTier: () => Promise.resolve('free'),
    getFoods: () => Promise.resolve(FOODS),
    consumeQuota: () => Promise.resolve(++quotaCalls),
    recordUsage: (_u, _f, i) => { usage.push(i); return Promise.resolve(); },
    savePlan: (_u, p) => { saved.push(p); return Promise.resolve('plan-1'); },
    getPlanItem: () => Promise.resolve({ meal_plan_id: 'plan-1', food_item_id: 'l1', meal_type: 'lunch' }),
    getPlanFoodIds: () => Promise.resolve(['b1', 'l1', 'd1']),
    swapItem: () => Promise.resolve('plan-1'),
    getPlan: () => Promise.resolve({ id: 'plan-1', generated_by: saved.at(-1)?.generated_by ?? 'fallback', items: [] } as unknown as MealPlanDTO),
    ...over,
  };
  return { repo, saved, usage, quotaCalls: () => quotaCalls };
}

function fakeAI(responses: Array<unknown | Error>): AIProvider & { calls: number } {
  const p = {
    name: 'anthropic' as const,
    calls: 0,
    generateJSON() {
      const r = responses[p.calls++];
      if (r instanceof Error) return Promise.reject(r);
      return Promise.resolve({ value: r, usage: { inputTokens: 100, outputTokens: 50 }, model: 'test-model' });
    },
    chat: () => Promise.reject(new Error('unused')),
  };
  return p;
}

const deps = (repo: PlannerRepo, ai: AIProvider | null): PlannerDeps => ({
  repo, ai: ai ? { provider: ai, model: 'claude-haiku-5-5', timeoutMs: 1000 } : null, allowSample: false, requestId: 'test',
  now: new Date('2026-11-24T00:00:00Z'),
});
const REQ = { action: 'generate' as const, plan_date: '2026-11-24' };

// Candidate order after filtering (no_pork removes l3): f1=b1 f2=b2 f3=l1 f4=l2 f5=d1
const VALID = {
  meals: [
    { meal_type: 'breakfast', food_id: 'f1', serving_count: 1, reason: 'ok' },
    { meal_type: 'lunch', food_id: 'f3', serving_count: 1, reason: 'ok' },
    { meal_type: 'dinner', food_id: 'f5', serving_count: 1, reason: 'ok' },
  ],
  summary: 'สรุป',
};

Deno.test('uses AI output when valid and records usage', async () => {
  const { repo, saved, usage } = fakeRepo();
  const ai = fakeAI([VALID]);
  await generatePlan('u1', REQ, deps(repo, ai));
  assertEquals(saved[0]!.generated_by, 'ai');
  assertEquals(saved[0]!.items.map((i) => i.food_item_id), ['b1', 'l1', 'd1']);
  assertEquals(usage, [100]);
});

Deno.test('invented food id → retry → deterministic fallback', async () => {
  const { repo, saved } = fakeRepo();
  const bad = { ...VALID, meals: [{ ...VALID.meals[0], food_id: 'f99' }, VALID.meals[1], VALID.meals[2]] };
  const ai = fakeAI([bad, bad]);
  await generatePlan('u1', REQ, deps(repo, ai));
  assertEquals(ai.calls, 2);
  assertEquals(saved[0]!.generated_by, 'fallback');
  assert(saved[0]!.items.every((i) => i.food_item_id !== 'l3'), 'respects no_pork restriction');
});

Deno.test('config errors are not retried', async () => {
  const { repo, saved } = fakeRepo();
  const ai = fakeAI([new AIError('config', 'x'), VALID]);
  await generatePlan('u1', REQ, deps(repo, ai));
  assertEquals(ai.calls, 1);
  assertEquals(saved[0]!.generated_by, 'fallback');
});

Deno.test('works without AI configured', async () => {
  const { repo, saved } = fakeRepo();
  await generatePlan('u1', REQ, deps(repo, null));
  assertEquals(saved[0]!.items.length, 3);
});

Deno.test('insufficient verified data → 422 and no quota consumed', async () => {
  const f = fakeRepo({ getFoods: () => Promise.resolve([food('b1', ['breakfast'])]) });
  const err = await assertRejects(() => generatePlan('u1', REQ, deps(f.repo, null)), HttpError);
  assertEquals(err.code, 'INSUFFICIENT_FOOD_DATA');
  assertEquals(f.quotaCalls(), 0);
});

Deno.test('quota exceeded → 429 and AI not called', async () => {
  const { repo } = fakeRepo({ consumeQuota: () => Promise.resolve(-1) });
  const ai = fakeAI([VALID]);
  const err = await assertRejects(() => generatePlan('u1', REQ, deps(repo, ai)), HttpError);
  assertEquals(err.code, 'QUOTA_EXCEEDED');
  assertEquals(ai.calls, 0);
});

Deno.test('swap picks a different allowed food', async () => {
  let swappedTo = '';
  const { repo } = fakeRepo({ swapItem: (_u, _i, foodId) => { swappedTo = foodId; return Promise.resolve('plan-1'); } });
  await swapMeal('u1', { action: 'swap', meal_plan_item_id: crypto.randomUUID(), reason: 'dislike' }, deps(repo, null));
  assertEquals(swappedTo, 'l2'); // l1 current, d1 dinner-only, l3 pork excluded
});

Deno.test('swap on unknown item → 404', async () => {
  const { repo } = fakeRepo({ getPlanItem: () => Promise.resolve(null) });
  const err = await assertRejects(
    () => swapMeal('u1', { action: 'swap', meal_plan_item_id: crypto.randomUUID(), reason: 'dislike' }, deps(repo, null)),
    HttpError,
  );
  assertEquals(err.code, 'NOT_FOUND');
});
