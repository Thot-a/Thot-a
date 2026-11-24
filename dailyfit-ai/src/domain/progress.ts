// Weekly progress summary — supportive framing only (no body-shape judgement).
import type { FoodLog } from '@/types/models';

export interface DayStat {
  date: string;
  logged: boolean;
  entries: number;
  kcal: number;
  protein: number;
  spendMid: number;
}

export interface WeeklyProgress {
  days: DayStat[];
  daysLogged: number;
  streak: number;
  avgKcalLoggedDays: number | null;
  avgSpendLoggedDays: number | null;
  plannedMealsEaten: number;
  plannedMealsTotal: number;
  topFoods: { name: string; count: number }[];
}

export function lastNDates(today: string, n: number): string[] {
  const out: string[] = [];
  const base = new Date(`${today}T00:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function computeWeeklyProgress(
  today: string,
  logs: readonly FoodLog[],
  plannedMealsByDate: Readonly<Record<string, number>> = {},
): WeeklyProgress {
  const dates = lastNDates(today, 7);
  const days: DayStat[] = dates.map((date) => {
    const ls = logs.filter((l) => l.log_date === date);
    return {
      date,
      logged: ls.length > 0,
      entries: ls.length,
      kcal: ls.reduce((s, l) => s + l.kcal, 0),
      protein: ls.reduce((s, l) => s + l.protein_g, 0),
      spendMid: ls.reduce((s, l) => s + ((l.food.price_min_thb + l.food.price_max_thb) / 2) * l.serving_count, 0),
    };
  });
  const logged = days.filter((d) => d.logged);

  // Streak counts back from today; an unlogged *today* doesn't break yesterday's streak yet.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]!.logged) streak++;
    else if (i === days.length - 1) continue;
    else break;
  }

  const counts = new Map<string, number>();
  for (const l of logs) if (dates.includes(l.log_date)) counts.set(l.food.name_th, (counts.get(l.food.name_th) ?? 0) + 1);

  const plannedTotal = dates.reduce((s, d) => s + (plannedMealsByDate[d] ?? 0), 0);
  const plannedEaten = logs.filter((l) => l.meal_plan_item_id && dates.includes(l.log_date)).length;

  return {
    days,
    daysLogged: logged.length,
    streak,
    avgKcalLoggedDays: logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : null,
    avgSpendLoggedDays: logged.length ? Math.round(logged.reduce((s, d) => s + d.spendMid, 0) / logged.length) : null,
    plannedMealsEaten: Math.min(plannedEaten, plannedTotal),
    plannedMealsTotal: plannedTotal,
    topFoods: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
  };
}
