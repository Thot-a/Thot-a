// Daily AI quotas per plan. Server-side only; the app just displays what the server returns.
export type Tier = 'free' | 'premium';
export type Feature = 'meal_plan' | 'meal_swap' | 'coach';

export const DAILY_QUOTA: Record<Tier, Record<Feature, number>> = {
  free: { meal_plan: 2, meal_swap: 3, coach: 5 },
  premium: { meal_plan: 10, meal_swap: 30, coach: 50 },
};

/** Bangkok calendar date — quotas reset at local midnight. */
export function bangkokDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
