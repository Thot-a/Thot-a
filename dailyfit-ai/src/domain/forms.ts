// Client-side form validation (the DB constraints and Edge Functions validate again).
import { z } from 'zod';

import { ACTIVITY_LEVELS, DIETARY_RESTRICTIONS, FOOD_TAGS, GOALS, LIMITS, SEXES } from '@shared/constants';

const email = z.string().trim().toLowerCase().email('รูปแบบอีเมลไม่ถูกต้อง').max(254);
const password = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(72, 'รหัสผ่านยาวเกินไป')
  .regex(/[A-Za-z]/, 'ต้องมีตัวอักษรอย่างน้อย 1 ตัว')
  .regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว');

export const SignInForm = z.object({ email, password: z.string().min(1, 'กรุณากรอกรหัสผ่าน') });
export const SignUpForm = z.object({
  displayName: z.string().trim().min(1, 'กรุณากรอกชื่อที่ให้เราเรียก').max(50, 'ชื่อยาวเกินไป'),
  email,
  password,
});
export const ForgotPasswordForm = z.object({ email });

const currentYear = new Date().getFullYear();

/** Optional numeric text input → number | null, with range validation. */
const optionalNumber = (min: number, max: number, msg: string, integer = false) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === '') return null;
      const n = Number(s.replace(',', '.'));
      if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
        ctx.addIssue({ code: 'custom', message: msg });
        return z.NEVER;
      }
      return n;
    });

export const BodyForm = z.object({
  displayName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(50, 'ชื่อยาวเกินไป'),
  birthYear: optionalNumber(1920, currentYear - 18, `ปีเกิด ค.ศ. 1920–${currentYear - 18} (แอปนี้สำหรับผู้ใหญ่)`, true),
  heightCm: optionalNumber(100, 250, 'ส่วนสูง 100–250 ซม.'),
  weightKg: optionalNumber(25, 300, 'น้ำหนัก 25–300 กก.'),
  sex: z.enum(SEXES).nullable(),
});
export type BodyFormOutput = z.output<typeof BodyForm>;

export const GoalForm = z.object({ goal: z.enum(GOALS), activityLevel: z.enum(ACTIVITY_LEVELS) });

export const FoodPrefsForm = z.object({
  dailyBudgetThb: optionalNumber(LIMITS.budgetMin, LIMITS.budgetMax, `งบประมาณ ${LIMITS.budgetMin}–${LIMITS.budgetMax} บาท`, true).refine(
    (v) => v !== null,
    'กรุณากรอกงบประมาณ',
  ),
  mealsPerDay: z.number().int().min(2).max(4),
  restrictions: z.array(z.enum(DIETARY_RESTRICTIONS)).max(DIETARY_RESTRICTIONS.length),
  excludedTags: z.array(z.enum(FOOD_TAGS)).max(20),
  likedTags: z.array(z.enum(FOOD_TAGS)).max(20),
});

/** Buddhist-era years (e.g. 2537) are common in Thailand — convert to CE when clearly BE. */
export function normalizeBirthYearInput(text: string): string {
  const n = Number(text.trim());
  if (Number.isInteger(n) && n > 2400 && n < 2700) return String(n - 543);
  return text;
}

export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
