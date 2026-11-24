// Isomorphic constants shared by the mobile app and Edge Functions.
// Keep in sync with the SQL allowlists in supabase/migrations/*_core_schema.sql
// (tests/domain/constants.test.ts checks this).

export const GOALS = ['healthy_lifestyle', 'weight_management', 'muscle_support', 'balanced_nutrition'] as const;
export type Goal = (typeof GOALS)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const SEXES = ['female', 'male', 'unspecified'] as const;
export type Sex = (typeof SEXES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_TAGS = [
  'chicken', 'pork', 'beef', 'seafood', 'fish', 'shrimp', 'egg', 'tofu', 'dairy', 'peanut',
  'vegetarian', 'vegan', 'spicy', 'fried', 'soup', 'rice', 'noodle', 'high_protein',
  'low_fat', 'quick', 'convenience_store', 'street_food', 'home_cooked', 'halal',
] as const;
export type FoodTag = (typeof FOOD_TAGS)[number];

export const DIETARY_RESTRICTIONS = [
  'vegetarian', 'vegan', 'halal', 'no_pork', 'no_beef', 'no_seafood',
  'seafood_allergy', 'peanut_allergy', 'egg_allergy', 'lactose_free', 'less_spicy',
] as const;
export type DietaryRestriction = (typeof DIETARY_RESTRICTIONS)[number];

/** Tags a restriction rules out. Allergies are treated as hard exclusions. */
export const RESTRICTION_EXCLUDES: Record<DietaryRestriction, readonly FoodTag[]> = {
  vegetarian: ['chicken', 'pork', 'beef', 'seafood', 'fish', 'shrimp'],
  vegan: ['chicken', 'pork', 'beef', 'seafood', 'fish', 'shrimp', 'egg', 'dairy'],
  halal: ['pork'],
  no_pork: ['pork'],
  no_beef: ['beef'],
  no_seafood: ['seafood', 'fish', 'shrimp'],
  seafood_allergy: ['seafood', 'fish', 'shrimp'],
  peanut_allergy: ['peanut'],
  egg_allergy: ['egg'],
  lactose_free: ['dairy'],
  less_spicy: ['spicy'],
};

/**
 * Restrictions that cannot be guaranteed from tags alone (cross-contamination, hidden ingredients).
 * The UI must tell users to double-check with the vendor.
 */
export const RESTRICTIONS_NEEDING_CAUTION: readonly DietaryRestriction[] = [
  'halal', 'seafood_allergy', 'peanut_allergy', 'egg_allergy', 'lactose_free', 'vegan', 'vegetarian',
];

export const LABELS_TH = {
  goal: {
    healthy_lifestyle: 'ใช้ชีวิตให้สุขภาพดี',
    weight_management: 'ดูแลน้ำหนัก',
    muscle_support: 'เสริมกล้ามเนื้อ',
    balanced_nutrition: 'กินให้สมดุล',
  } satisfies Record<Goal, string>,
  activity: {
    sedentary: 'นั่งทำงานเกือบทั้งวัน',
    light: 'เดินบ้าง ออกกำลังกาย 1–2 วัน/สัปดาห์',
    moderate: 'ออกกำลังกาย 3–4 วัน/สัปดาห์',
    active: 'ออกกำลังกาย 5–6 วัน/สัปดาห์',
    very_active: 'ออกกำลังกายหนักทุกวัน',
  } satisfies Record<ActivityLevel, string>,
  sex: { female: 'หญิง', male: 'ชาย', unspecified: 'ไม่ระบุ' } satisfies Record<Sex, string>,
  meal: { breakfast: 'มื้อเช้า', lunch: 'มื้อกลางวัน', dinner: 'มื้อเย็น', snack: 'ของว่าง' } satisfies Record<MealType, string>,
  restriction: {
    vegetarian: 'มังสวิรัติ',
    vegan: 'วีแกน',
    halal: 'ฮาลาล',
    no_pork: 'ไม่ทานหมู',
    no_beef: 'ไม่ทานเนื้อวัว',
    no_seafood: 'ไม่ทานอาหารทะเล',
    seafood_allergy: 'แพ้อาหารทะเล',
    peanut_allergy: 'แพ้ถั่วลิสง',
    egg_allergy: 'แพ้ไข่',
    lactose_free: 'ไม่ทานนมวัว',
    less_spicy: 'ไม่ทานเผ็ด',
  } satisfies Record<DietaryRestriction, string>,
  tag: {
    chicken: 'ไก่', pork: 'หมู', beef: 'เนื้อวัว', seafood: 'อาหารทะเล', fish: 'ปลา', shrimp: 'กุ้ง',
    egg: 'ไข่', tofu: 'เต้าหู้', dairy: 'นม/ชีส', peanut: 'ถั่วลิสง', vegetarian: 'มังสวิรัติ', vegan: 'วีแกน',
    spicy: 'เผ็ด', fried: 'ของทอด', soup: 'เมนูน้ำ', rice: 'ข้าว', noodle: 'เส้น', high_protein: 'โปรตีนสูง',
    low_fat: 'ไขมันต่ำ', quick: 'ซื้อง่าย/เร็ว', convenience_store: 'ร้านสะดวกซื้อ', street_food: 'ร้านข้างทาง',
    home_cooked: 'ทำเองที่บ้าน', halal: 'ฮาลาล',
  } satisfies Record<FoodTag, string>,
} as const;

/** Bump when the privacy policy / terms text changes; users must re-consent. */
export const POLICY_VERSION = '2026-11-24';

export const LIMITS = {
  budgetMin: 30,
  budgetMax: 2000,
  coachMessageMaxChars: 1000,
} as const;
