import { describe, expect, it } from 'vitest';

import {
  buildCandidateIndex,
  buildPlannerUserPrompt,
  computeTotals,
  deterministicPlan,
  type FoodCandidate,
  filterCandidates,
  missingMealCoverage,
  type PlanContext,
  pickSwap,
  resolveExcludedTags,
  validateAIPlan,
} from '@shared/planner';

const food = (id: string, over: Partial<FoodCandidate> = {}): FoodCandidate => ({
  id,
  name_th: `เมนู ${id}`,
  category: 'rice_dish',
  meal_types: ['breakfast', 'lunch', 'dinner'],
  tags: [],
  kcal: 500,
  protein_g: 20,
  carbs_g: 60,
  fat_g: 15,
  price_min_thb: 40,
  price_max_thb: 60,
  verification_status: 'verified',
  ...over,
});

const foods: FoodCandidate[] = [
  food('a', { meal_types: ['breakfast'], kcal: 300, price_min_thb: 20, price_max_thb: 30, tags: ['egg', 'quick'] }),
  food('b', { meal_types: ['breakfast'], kcal: 350, price_min_thb: 30, price_max_thb: 40 }),
  food('c', { meal_types: ['lunch', 'dinner'], kcal: 550, tags: ['pork', 'spicy'] }),
  food('d', { meal_types: ['lunch', 'dinner'], kcal: 480, tags: ['chicken'] }),
  food('e', { meal_types: ['lunch', 'dinner'], kcal: 420, tags: ['shrimp', 'seafood'], price_min_thb: 100, price_max_thb: 140 }),
  food('f', { meal_types: ['lunch', 'dinner'], kcal: 600, verification_status: 'sample' }),
  food('g', { meal_types: ['dinner'], kcal: 300, tags: ['soup', 'low_fat'], price_min_thb: 35, price_max_thb: 50 }),
];

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  goal: 'healthy_lifestyle',
  budgetThb: 150,
  mealTypes: ['breakfast', 'lunch', 'dinner'],
  targets: { kcalMin: 1500, kcalMax: 1700, proteinMinG: 50, proteinMaxG: 70, basis: 'estimated' },
  likedTags: [],
  excludedTags: [],
  seed: 'user-1:2026-11-24',
  ...over,
});

describe('filterCandidates', () => {
  it('drops excluded tags, unverified-sample (unless allowed) and over-priced items', () => {
    const out = filterCandidates(foods, { excludedTags: ['pork'], budgetThb: 150, mealTypes: ['breakfast', 'lunch', 'dinner'], allowSample: false });
    const ids = out.map((f) => f.id);
    expect(ids).not.toContain('c'); // pork
    expect(ids).not.toContain('f'); // sample
    expect(ids).not.toContain('e'); // 100 > cap: 150 * (0.35/0.9) * 1.5 ≈ 87
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'd', 'g']));
  });

  it('includes sample items only when allowed', () => {
    const out = filterCandidates(foods, { excludedTags: [], budgetThb: 500, mealTypes: ['lunch'], allowSample: true });
    expect(out.map((f) => f.id)).toContain('f');
  });

  it('restrictions expand to excluded tags (allergy = hard exclusion)', () => {
    expect(resolveExcludedTags(['spicy'], ['seafood_allergy', 'halal'])).toEqual(['fish', 'pork', 'seafood', 'shrimp', 'spicy']);
  });

  it('reports meals without enough options', () => {
    expect(missingMealCoverage([foods[0]!], ['breakfast', 'lunch'])).toEqual(['breakfast', 'lunch']);
    expect(missingMealCoverage(foods, ['breakfast', 'lunch', 'dinner'])).toEqual([]);
  });
});

describe('validateAIPlan', () => {
  const cands = filterCandidates(foods, { excludedTags: [], budgetThb: 150, mealTypes: ['breakfast', 'lunch', 'dinner'], allowSample: false });
  const index = buildCandidateIndex(cands);
  const idOf = (realId: string) => [...index.entries()].find(([, f]) => f.id === realId)![0];

  const good = () => ({
    meals: [
      { meal_type: 'breakfast', food_id: idOf('a'), serving_count: 1, reason: 'เร็ว' },
      { meal_type: 'lunch', food_id: idOf('d'), serving_count: 1, reason: 'อิ่ม' },
      { meal_type: 'dinner', food_id: idOf('g'), serving_count: 1, reason: 'เบา' },
    ],
    summary: 'แผนสมดุล',
  });

  it('accepts a valid plan and maps short ids back to real ids', () => {
    const r = validateAIPlan(good(), ctx(), index);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items.map((i) => i.food_item_id)).toEqual(['a', 'd', 'g']);
  });

  it('rejects invented food ids', () => {
    const p = good();
    p.meals[0]!.food_id = 'f999';
    expect(validateAIPlan(p, ctx(), index)).toEqual({ ok: false, reason: 'UNKNOWN_FOOD_ID:f999' });
  });

  it('rejects malformed JSON shapes', () => {
    expect(validateAIPlan({ meals: 'x' }, ctx(), index).ok).toBe(false);
    expect(validateAIPlan(null, ctx(), index).ok).toBe(false);
    expect(validateAIPlan({ ...good(), meals: [{ ...good().meals[0], kcal: 9999, food_id: 'abc' }] }, ctx(), index).ok).toBe(false);
  });

  it('rejects missing meals, odd servings and over-budget plans', () => {
    const missing = good();
    missing.meals.pop();
    expect(validateAIPlan(missing, ctx(), index)).toMatchObject({ ok: false, reason: 'MISSING_MEALS:dinner' });

    const odd = good();
    odd.meals[0]!.serving_count = 0.7;
    expect(validateAIPlan(odd, ctx(), index)).toMatchObject({ ok: false, reason: 'BAD_SERVING' });

    const pricey = good();
    pricey.meals[1]!.serving_count = 2;
    pricey.meals[2]!.serving_count = 2;
    expect(validateAIPlan(pricey, ctx({ budgetThb: 150 }), index)).toMatchObject({ ok: false, reason: 'OVER_BUDGET' });
  });

  it('sanitises reasons', () => {
    const p = good();
    p.meals[0]!.reason = '<script>alert(1)</script>';
    const r = validateAIPlan(p, ctx(), index);
    expect(r.ok && r.items[0]!.reason_th).not.toContain('<');
  });

  it('prompt contains only short ids and marks user data as data', () => {
    const prompt = buildPlannerUserPrompt(ctx(), index);
    expect(prompt).toContain('<candidates');
    expect(prompt).not.toMatch(/^[a-g]\|/m); // real ids are not leaked as ids
    expect(prompt).toMatch(/^f1\|/m);
  });
});

describe('deterministicPlan', () => {
  const cands = filterCandidates(foods, { excludedTags: [], budgetThb: 150, mealTypes: ['breakfast', 'lunch', 'dinner'], allowSample: false });

  it('covers every meal, stays in budget, and is deterministic', () => {
    const p1 = deterministicPlan(cands, ctx());
    const p2 = deterministicPlan(cands, ctx());
    expect(p1).toEqual(p2);
    expect(p1.map((i) => i.meal_type)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(computeTotals(p1, cands).priceMid).toBeLessThanOrEqual(150);
    expect(new Set(p1.map((i) => i.food_item_id)).size).toBe(3);
  });

  it('downgrades to cheaper items when budget is tight', () => {
    const p = deterministicPlan(cands, ctx({ budgetThb: 110 }));
    expect(computeTotals(p, cands).priceMid).toBeLessThanOrEqual(130);
  });
});

describe('pickSwap', () => {
  it('finds a cheaper alternative for the same meal', () => {
    const s = pickSwap(foods, { food_item_id: 'e', meal_type: 'lunch' }, [], 'cheaper', 's');
    expect(s).not.toBeNull();
    expect(s!.id).not.toBe('e');
    expect(s!.meal_types).toContain('lunch');
  });
  it('returns null when nothing qualifies', () => {
    expect(pickSwap(foods, { food_item_id: 'a', meal_type: 'breakfast' }, ['b'], 'dislike', 's')).toBeNull();
  });
});
