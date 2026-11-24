import { describe, expect, it } from 'vitest';

import { bmrMifflinStJeor, computeDailyTargets, mealShares, mealTypesFor } from '@shared/nutrition';

const today = new Date('2026-11-24T00:00:00Z');
const base = { birthYear: 1994, sex: 'female' as const, heightCm: 160, weightKg: 55, activityLevel: 'light' as const, goal: 'healthy_lifestyle' as const };

describe('nutrition', () => {
  it('Mifflin-St Jeor matches reference values', () => {
    // 10*55 + 6.25*160 - 5*32 - 161 = 1229
    expect(bmrMifflinStJeor(55, 160, 32, 'female')).toBe(1229);
    expect(bmrMifflinStJeor(70, 175, 30, 'male')).toBe(1648.75);
  });

  it('returns null when body data is missing (no guessing)', () => {
    expect(computeDailyTargets({ ...base, weightKg: null }, today)).toBeNull();
    expect(computeDailyTargets({ ...base, birthYear: null }, today)).toBeNull();
  });

  it('returns null for minors', () => {
    expect(computeDailyTargets({ ...base, birthYear: 2010 }, today)).toBeNull();
  });

  it('weight management uses a gentle deficit and respects the floor', () => {
    const t = computeDailyTargets({ ...base, goal: 'weight_management', weightKg: 45, heightCm: 150, activityLevel: 'sedentary' }, today)!;
    expect(t.kcalMin).toBeGreaterThanOrEqual(1200);
    expect(t.kcalMax).toBeGreaterThan(t.kcalMin);
  });

  it('muscle support raises protein range', () => {
    const a = computeDailyTargets(base, today)!;
    const b = computeDailyTargets({ ...base, goal: 'muscle_support' }, today)!;
    expect(b.proteinMinG).toBeGreaterThan(a.proteinMinG);
    expect(b.kcalMin).toBeGreaterThanOrEqual(a.kcalMin);
  });

  it('unspecified sex still produces a target', () => {
    expect(computeDailyTargets({ ...base, sex: null }, today)).not.toBeNull();
  });

  it('meal types and shares', () => {
    expect(mealTypesFor(2)).toEqual(['lunch', 'dinner']);
    expect(mealTypesFor(4)).toHaveLength(4);
    const s = mealShares(mealTypesFor(3));
    expect(s.breakfast + s.lunch + s.dinner).toBeCloseTo(1);
    expect(s.snack).toBe(0);
  });
});
