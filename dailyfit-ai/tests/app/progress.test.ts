import { describe, expect, it } from 'vitest';

import { computeWeeklyProgress, lastNDates } from '@/domain/progress';
import type { FoodLog } from '@/types/models';

const log = (date: string, kcal: number, planItem: string | null = null, name = 'ข้าว'): FoodLog => ({
  id: `${date}-${kcal}`,
  log_date: date,
  meal_type: 'lunch',
  serving_count: 1,
  kcal,
  protein_g: 10,
  carbs_g: 10,
  fat_g: 10,
  meal_plan_item_id: planItem,
  created_at: '',
  food: { id: 'f', name_th: name, category: 'rice_dish', image_path: null, serving_description_th: '', price_min_thb: 40, price_max_thb: 60 },
});

describe('weekly progress', () => {
  it('lists the last 7 dates ending today', () => {
    expect(lastNDates('2026-11-24', 7)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24']);
  });

  it('computes consistency, streak (today not yet logged is ok) and averages', () => {
    const p = computeWeeklyProgress('2026-11-24', [log('2026-11-23', 500), log('2026-11-22', 300), log('2026-11-22', 200), log('2026-11-10', 999)]);
    expect(p.daysLogged).toBe(2);
    expect(p.streak).toBe(2);
    expect(p.avgKcalLoggedDays).toBe(500);
    expect(p.avgSpendLoggedDays).toBe(75); // (50 + 100) / 2
  });

  it('plan adherence never exceeds planned meals', () => {
    const p = computeWeeklyProgress('2026-11-24', [log('2026-11-24', 100, 'i1'), log('2026-11-24', 100, 'i2')], { '2026-11-24': 1 });
    expect(p.plannedMealsEaten).toBe(1);
    expect(p.plannedMealsTotal).toBe(1);
  });

  it('empty week', () => {
    const p = computeWeeklyProgress('2026-11-24', []);
    expect(p.daysLogged).toBe(0);
    expect(p.avgKcalLoggedDays).toBeNull();
  });
});
