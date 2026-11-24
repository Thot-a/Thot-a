// Estimated daily energy / protein ranges for meal planning.
// These are general-population estimates (Mifflin-St Jeor), NOT medical advice or diagnosis.
// Shown to users as "ช่วงโดยประมาณ" only.

import type { ActivityLevel, Goal, MealType, Sex } from './constants.ts';

export interface NutritionProfile {
  birthYear: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface DailyTargets {
  kcalMin: number;
  kcalMax: number;
  proteinMinG: number;
  proteinMaxG: number;
  basis: 'estimated';
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Never plan below these, regardless of goal (avoid encouraging very-low-calorie diets). */
const KCAL_FLOOR: Record<Sex, number> = { female: 1200, male: 1500, unspecified: 1350 };

export function ageFromBirthYear(birthYear: number, today: Date = new Date()): number {
  return today.getFullYear() - birthYear;
}

export function bmrMifflinStJeor(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // Sex constant: +5 (male), −161 (female). Unspecified uses the midpoint.
  const s = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return base + s;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Returns null when the user hasn't provided enough data — planning then relies on budget/preferences only.
 */
export function computeDailyTargets(p: NutritionProfile, today: Date = new Date()): DailyTargets | null {
  if (!p.birthYear || !p.heightCm || !p.weightKg) return null;
  const age = ageFromBirthYear(p.birthYear, today);
  if (age < 18 || age > 100) return null; // product is for adults; don't estimate for minors
  const sex: Sex = p.sex ?? 'unspecified';
  const tdee = bmrMifflinStJeor(p.weightKg, p.heightCm, age, sex) * ACTIVITY_FACTOR[p.activityLevel];

  let lo: number;
  let hi: number;
  let proteinPerKg: [number, number];
  switch (p.goal) {
    case 'weight_management':
      // Gentle deficit only (10–15%); never aggressive.
      lo = tdee * 0.85;
      hi = tdee * 0.9;
      proteinPerKg = [1.0, 1.4];
      break;
    case 'muscle_support':
      lo = tdee;
      hi = tdee * 1.1;
      proteinPerKg = [1.2, 1.6];
      break;
    case 'healthy_lifestyle':
    case 'balanced_nutrition':
    default:
      lo = tdee * 0.95;
      hi = tdee * 1.05;
      proteinPerKg = [0.8, 1.2];
  }
  const floor = KCAL_FLOOR[sex];
  lo = Math.max(lo, floor);
  hi = Math.max(hi, lo + 100);

  return {
    kcalMin: round10(lo),
    kcalMax: round10(hi),
    proteinMinG: Math.round(p.weightKg * proteinPerKg[0]),
    proteinMaxG: Math.round(p.weightKg * proteinPerKg[1]),
    basis: 'estimated',
  };
}

export function mealTypesFor(mealsPerDay: number): MealType[] {
  if (mealsPerDay <= 2) return ['lunch', 'dinner'];
  if (mealsPerDay === 3) return ['breakfast', 'lunch', 'dinner'];
  return ['breakfast', 'lunch', 'dinner', 'snack'];
}

/** Share of daily energy/budget allocated per meal type (normalised over the meals in the plan). */
const MEAL_WEIGHT: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

export function mealShares(mealTypes: readonly MealType[]): Record<MealType, number> {
  const total = mealTypes.reduce((s, m) => s + MEAL_WEIGHT[m], 0);
  const out = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } as Record<MealType, number>;
  for (const m of mealTypes) out[m] = MEAL_WEIGHT[m] / total;
  return out;
}
