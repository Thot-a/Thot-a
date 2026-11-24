// DEMO MODE ONLY. In-memory data so every screen is interactive without a backend.
// Reuses the real shared planner logic so behaviour matches production as closely as possible.
import { POLICY_VERSION, type MealType } from '@shared/constants';
import type { MealPlanDTO, MealPlanItemDTO } from '@shared/contracts';
import { computeDailyTargets, mealTypesFor } from '@shared/nutrition';
import {
  deterministicPlan,
  type FoodCandidate,
  filterCandidates,
  pickSwap,
  resolveExcludedTags,
  type SwapReason,
} from '@shared/planner';

import type { ConsentState, ConsentType } from '@/services/consents';
import type { PreferencesUpdate, Profile, ProfileUpdate } from '@/services/profile';
import type { ChatMessage, FoodItem, FoodLog, UserSummary } from '@/types/models';
import { bangkokToday } from '@/utils/date';

import { coachReply } from './coach';
import { DEMO_FOODS } from './foods';

const FOODS: FoodItem[] = DEMO_FOODS.map(({ slug: _slug, ...f }) => ({ ...f, image_path: null, verification_status: 'sample' }));
const CANDIDATES: FoodCandidate[] = FOODS.map((f) => ({
  id: f.id,
  name_th: f.name_th,
  category: f.category,
  meal_types: f.meal_types,
  tags: f.tags as FoodCandidate['tags'],
  kcal: f.kcal,
  protein_g: f.protein_g,
  carbs_g: f.carbs_g,
  fat_g: f.fat_g,
  price_min_thb: f.price_min_thb,
  price_max_thb: f.price_max_thb,
  verification_status: 'sample',
}));

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

type Listener = () => void;
const listeners = new Set<Listener>();
export const subscribeDemoAuth = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

interface State {
  user: UserSummary | null;
  profile: Profile | null;
  consents: ConsentState;
  plans: Map<string, MealPlanDTO>;
  logs: FoodLog[];
  chat: ChatMessage[];
  usage: Map<string, number>;
}

const state: State = { user: null, profile: null, consents: {}, plans: new Map(), logs: [], chat: [], usage: new Map() };

function freshProfile(id: string, name: string | null): Profile {
  return {
    id,
    displayName: name,
    birthYear: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    goal: 'healthy_lifestyle',
    activityLevel: 'light',
    dailyBudgetThb: 150,
    onboardingCompletedAt: null,
    mealsPerDay: 3,
    likedTags: [],
    excludedTags: [],
    restrictions: [],
    mealReminders: false,
  };
}

/** A few days of sample history so Progress has something to show. */
function seedHistory(userId: string) {
  const today = bangkokToday();
  const day = (offset: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const picks: [number, MealType, string][] = [
    [1, 'breakfast', 'demo-jok-moo'], [1, 'lunch', 'demo-khao-man-gai-tom'], [1, 'dinner', 'demo-suki-nam-gai'],
    [2, 'lunch', 'demo-khao-kaprao-gai'], [2, 'dinner', 'demo-gaeng-jued-tao-hoo'],
    [3, 'breakfast', 'demo-sandwich-tuna'], [3, 'lunch', 'demo-kuay-tiew-nam-gai'], [3, 'dinner', 'demo-salad-ok-gai'],
    [5, 'lunch', 'demo-khao-pad-gai'], [6, 'breakfast', 'demo-khai-tom'], [6, 'lunch', 'demo-pad-see-ew-moo'],
  ];
  state.logs = picks.map(([o, meal, foodId]) => makeLog(foodId, day(o), meal, 1, null));
  void userId;
}

function makeLog(foodId: string, date: string, meal: MealType, serving: number, planItemId: string | null): FoodLog {
  const f = FOODS.find((x) => x.id === foodId)!;
  return {
    id: uid('log'),
    log_date: date,
    meal_type: meal,
    serving_count: serving,
    kcal: Math.round(f.kcal * serving * 10) / 10,
    protein_g: Math.round(f.protein_g * serving * 10) / 10,
    carbs_g: Math.round(f.carbs_g * serving * 10) / 10,
    fat_g: Math.round(f.fat_g * serving * 10) / 10,
    meal_plan_item_id: planItemId,
    created_at: new Date().toISOString(),
    food: {
      id: f.id,
      name_th: f.name_th,
      category: f.category,
      image_path: null,
      serving_description_th: f.serving_description_th,
      price_min_thb: f.price_min_thb,
      price_max_thb: f.price_max_thb,
    },
  };
}

function requireUser(): UserSummary {
  if (!state.user) throw Object.assign(new Error('unauth'), { status: 401 });
  return state.user;
}

// ---------------------------------------------------------------- auth
export const demoAuth = {
  currentUser: () => state.user,
  async signIn(email: string) {
    await wait();
    const id = 'demo-user';
    state.user = { id, email };
    if (!state.profile) {
      // Signing in to the demo skips onboarding with sensible defaults.
      state.profile = { ...freshProfile(id, 'มด'), onboardingCompletedAt: new Date().toISOString() };
      state.consents = Object.fromEntries(
        (['privacy_policy', 'terms', 'health_data'] as const).map((t) => [t, { granted: true, policyVersion: POLICY_VERSION }]),
      );
      seedHistory(id);
    }
    listeners.forEach((l) => l());
  },
  async signUp(email: string, name: string) {
    await wait();
    const id = 'demo-user';
    state.user = { id, email };
    state.profile = freshProfile(id, name);
    state.consents = {};
    seedHistory(id);
    listeners.forEach((l) => l());
    return { needsConfirmation: false };
  },
  async signOut() {
    await wait(150);
    state.user = null;
    listeners.forEach((l) => l());
  },
  async deleteAccount() {
    await wait();
    Object.assign(state, { user: null, profile: null, consents: {}, plans: new Map(), logs: [], chat: [], usage: new Map() });
    listeners.forEach((l) => l());
  },
};

// ---------------------------------------------------------------- profile & consents
export const demoProfile = {
  async get(): Promise<Profile> {
    await wait(150);
    requireUser();
    return { ...state.profile! };
  },
  async update(u: ProfileUpdate) {
    await wait();
    const p = state.profile!;
    state.profile = {
      ...p,
      ...Object.fromEntries(Object.entries(u).filter(([k, v]) => v !== undefined && k !== 'onboardingCompleted')),
      onboardingCompletedAt: u.onboardingCompleted ? new Date().toISOString() : p.onboardingCompletedAt,
    } as Profile;
  },
  async updatePreferences(u: PreferencesUpdate) {
    await wait();
    const p = state.profile!;
    state.profile = {
      ...p,
      mealsPerDay: u.mealsPerDay ?? p.mealsPerDay,
      likedTags: u.likedTags ?? p.likedTags,
      excludedTags: u.excludedTags ?? p.excludedTags,
      restrictions: u.restrictions ?? p.restrictions,
      mealReminders: u.mealReminders ?? p.mealReminders,
    };
  },
  async getConsents(): Promise<ConsentState> {
    await wait(100);
    return { ...state.consents };
  },
  async recordConsents(d: Partial<Record<ConsentType, boolean>>) {
    await wait();
    for (const [k, v] of Object.entries(d)) state.consents[k as ConsentType] = { granted: !!v, policyVersion: POLICY_VERSION };
  },
};

// ---------------------------------------------------------------- foods
export const demoFoods = {
  async list(): Promise<FoodItem[]> {
    await wait(150);
    return FOODS;
  },
  async get(id: string): Promise<FoodItem | null> {
    await wait(100);
    return FOODS.find((f) => f.id === id) ?? null;
  },
};

// ---------------------------------------------------------------- meal plans
const QUOTA = { meal_plan: 2, meal_swap: 3, coach: 5 };
function consumeQuota(feature: keyof typeof QUOTA) {
  const key = `${bangkokToday()}:${feature}`;
  const used = (state.usage.get(key) ?? 0) + 1;
  if (used > QUOTA[feature]) throw Object.assign(new Error('quota'), { code: 'QUOTA_EXCEEDED' });
  state.usage.set(key, used);
  return { used, limit: QUOTA[feature] };
}

function toDTO(planId: string, date: string, opts: PlanOptions, items: ReturnType<typeof deterministicPlan>, summary: string): MealPlanDTO {
  const dtoItems: MealPlanItemDTO[] = items.map((it) => {
    const f = FOODS.find((x) => x.id === it.food_item_id)!;
    const s = it.serving_count;
    return {
      id: uid('item'),
      meal_type: it.meal_type,
      position: it.position,
      serving_count: s,
      reason_th: it.reason_th,
      kcal: f.kcal * s,
      protein_g: f.protein_g * s,
      carbs_g: f.carbs_g * s,
      fat_g: f.fat_g * s,
      price_min_thb: Math.round(f.price_min_thb * s),
      price_max_thb: Math.round(f.price_max_thb * s),
      food: {
        id: f.id,
        name_th: f.name_th,
        name_en: f.name_en,
        category: f.category,
        serving_description_th: f.serving_description_th,
        image_path: null,
        description_th: null,
        verification_status: 'sample',
      },
    };
  });
  return recomputeTotals({
    id: planId,
    plan_date: date,
    goal: opts.goal,
    budget_thb: opts.budgetThb,
    meals_per_day: opts.mealsPerDay,
    total_kcal: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    total_price_min_thb: 0,
    total_price_max_thb: 0,
    generated_by: 'fallback',
    summary_th: summary,
    uses_sample_data: true,
    items: dtoItems,
  });
}

function recomputeTotals(p: MealPlanDTO): MealPlanDTO {
  const sum = (k: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'price_min_thb' | 'price_max_thb') => p.items.reduce((s, i) => s + i[k], 0);
  return {
    ...p,
    total_kcal: sum('kcal'),
    total_protein_g: sum('protein_g'),
    total_carbs_g: sum('carbs_g'),
    total_fat_g: sum('fat_g'),
    total_price_min_thb: sum('price_min_thb'),
    total_price_max_thb: sum('price_max_thb'),
  };
}

export interface PlanOptions {
  budgetThb: number;
  mealsPerDay: number;
  goal: Profile['goal'];
  excludedTags: Profile['excludedTags'];
  likedTags: Profile['likedTags'];
}

export const demoPlans = {
  async getActive(date: string): Promise<MealPlanDTO | null> {
    await wait(200);
    return state.plans.get(date) ?? null;
  },
  async generate(date: string, override?: Partial<PlanOptions>) {
    await wait(900);
    const p = state.profile!;
    const opts: PlanOptions = {
      budgetThb: override?.budgetThb ?? p.dailyBudgetThb,
      mealsPerDay: override?.mealsPerDay ?? p.mealsPerDay,
      goal: override?.goal ?? p.goal,
      excludedTags: override?.excludedTags ?? p.excludedTags,
      likedTags: override?.likedTags ?? p.likedTags,
    };
    const mealTypes = mealTypesFor(opts.mealsPerDay);
    const excluded = resolveExcludedTags(opts.excludedTags, p.restrictions);
    const cands = filterCandidates(CANDIDATES, { excludedTags: excluded, budgetThb: opts.budgetThb, mealTypes, allowSample: true });
    if (mealTypes.some((m) => cands.filter((c) => c.meal_types.includes(m)).length < 2)) {
      throw Object.assign(new Error('data'), { code: 'INSUFFICIENT_FOOD_DATA' });
    }
    const quota = consumeQuota('meal_plan');
    const items = deterministicPlan(cands, {
      goal: opts.goal,
      budgetThb: opts.budgetThb,
      mealTypes,
      targets: computeDailyTargets({ ...p, goal: opts.goal }),
      likedTags: opts.likedTags,
      excludedTags: excluded,
      seed: `${date}:${quota.used}`,
    });
    const plan = toDTO(uid('plan'), date, opts, items, 'แผนตัวอย่างที่จัดตามงบและความชอบของคุณ เน้นเมนูที่หาซื้อง่ายใกล้ที่ทำงาน');
    state.plans.set(date, plan);
    return { plan, is_estimate: true as const, quota };
  },
  async swap(date: string, itemId: string, reason: SwapReason) {
    await wait(600);
    const plan = state.plans.get(date);
    const item = plan?.items.find((i) => i.id === itemId);
    if (!plan || !item) throw Object.assign(new Error('nf'), { code: 'NOT_FOUND' });
    const p = state.profile!;
    const excluded = resolveExcludedTags(p.excludedTags, p.restrictions);
    const pool = filterCandidates(CANDIDATES, { excludedTags: excluded, budgetThb: plan.budget_thb, mealTypes: [item.meal_type], allowSample: true });
    const cur = CANDIDATES.find((c) => c.id === item.food.id);
    const choice = pickSwap(cur && !pool.includes(cur) ? [...pool, cur] : pool, { food_item_id: item.food.id, meal_type: item.meal_type },
      plan.items.map((i) => i.food.id), reason, `${itemId}:${Date.now()}`);
    if (!choice) throw Object.assign(new Error('data'), { code: 'INSUFFICIENT_FOOD_DATA' });
    const quota = consumeQuota('meal_swap');
    const REASON: Record<SwapReason, string> = {
      dislike: 'ตัวเลือกใหม่ที่เหมาะกับมื้อนี้',
      cheaper: 'ราคาประหยัดกว่าเมนูเดิม',
      lighter: 'พลังงานเบากว่าเมนูเดิม',
      more_protein: 'โปรตีนมากกว่าเมนูเดิม',
    };
    const [replacement] = toDTO(plan.id, date, { ...p, budgetThb: plan.budget_thb, mealsPerDay: plan.meals_per_day },
      [{ food_item_id: choice.id, meal_type: item.meal_type, serving_count: item.serving_count, position: item.position, reason_th: REASON[reason] }], '').items;
    const next = recomputeTotals({ ...plan, items: plan.items.map((i) => (i.id === itemId ? { ...replacement!, id: itemId } : i)) });
    state.plans.set(date, next);
    return { plan: next, is_estimate: true as const, quota };
  },
};

// ---------------------------------------------------------------- food logs
export const demoLogs = {
  async listRange(from: string, to: string): Promise<FoodLog[]> {
    await wait(150);
    requireUser();
    return state.logs.filter((l) => l.log_date >= from && l.log_date <= to).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async add(v: { foodId: string; date: string; mealType: MealType; servingCount: number; mealPlanItemId?: string | null }) {
    await wait();
    const log = makeLog(v.foodId, v.date, v.mealType, v.servingCount, v.mealPlanItemId ?? null);
    state.logs.push(log);
    return log;
  },
  async update(id: string, v: { servingCount?: number; mealType?: MealType }) {
    await wait();
    const i = state.logs.findIndex((l) => l.id === id);
    if (i < 0) throw Object.assign(new Error('nf'), { code: 'NOT_FOUND' });
    const old = state.logs[i]!;
    const next = makeLog(old.food.id, old.log_date, v.mealType ?? old.meal_type, v.servingCount ?? old.serving_count, old.meal_plan_item_id);
    state.logs[i] = { ...next, id: old.id, created_at: old.created_at };
  },
  async remove(id: string) {
    await wait(200);
    state.logs = state.logs.filter((l) => l.id !== id);
  },
};

// ---------------------------------------------------------------- coach
export const demoCoach = {
  async history(): Promise<ChatMessage[]> {
    await wait(150);
    return [...state.chat];
  },
  async send(message: string) {
    const quota = consumeQuota('coach');
    const userMsg: ChatMessage = { id: uid('m'), role: 'user', content: message, created_at: new Date().toISOString() };
    state.chat.push(userMsg);
    await wait(1100);
    const today = state.plans.get(bangkokToday()) ?? null;
    const reply: ChatMessage = {
      id: uid('m'),
      role: 'assistant',
      content: coachReply(message, { profile: state.profile!, todayPlan: today, foods: FOODS }),
      created_at: new Date().toISOString(),
    };
    state.chat.push(reply);
    return { reply, quota };
  },
  async clear() {
    await wait(150);
    state.chat = [];
  },
};
