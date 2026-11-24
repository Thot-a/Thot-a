import { describe, expect, it } from 'vitest';

import { BodyForm, FoodPrefsForm, normalizeBirthYearInput, SignUpForm } from '@/domain/forms';

describe('forms', () => {
  it('sign-up requires a reasonable password', () => {
    expect(SignUpForm.safeParse({ displayName: 'มด', email: 'a@b.co', password: 'short1' }).success).toBe(false);
    expect(SignUpForm.safeParse({ displayName: 'มด', email: 'a@b.co', password: 'abcdefgh' }).success).toBe(false);
    expect(SignUpForm.safeParse({ displayName: 'มด', email: 'A@B.co ', password: 'abcd1234' }).success).toBe(true);
  });

  it('body fields are optional but validated when provided', () => {
    const empty = BodyForm.parse({ displayName: 'มด', birthYear: '', heightCm: '', weightKg: '', sex: null });
    expect(empty).toMatchObject({ birthYear: null, heightCm: null, weightKg: null });
    expect(BodyForm.safeParse({ displayName: 'มด', birthYear: '', heightCm: '20', weightKg: '', sex: null }).success).toBe(false);
    expect(BodyForm.parse({ displayName: 'มด', birthYear: '1994', heightCm: '165,5', weightKg: '58', sex: 'female' }).heightCm).toBe(165.5);
  });

  it('rejects minors', () => {
    const y = String(new Date().getFullYear() - 15);
    expect(BodyForm.safeParse({ displayName: 'มด', birthYear: y, heightCm: '', weightKg: '', sex: null }).success).toBe(false);
  });

  it('converts Buddhist-era years', () => {
    expect(normalizeBirthYearInput('2537')).toBe('1994');
    expect(normalizeBirthYearInput('1994')).toBe('1994');
  });

  it('budget must be within limits', () => {
    const base = { mealsPerDay: 3, restrictions: [], excludedTags: [], likedTags: [] };
    expect(FoodPrefsForm.safeParse({ ...base, dailyBudgetThb: '10' }).success).toBe(false);
    expect(FoodPrefsForm.safeParse({ ...base, dailyBudgetThb: '' }).success).toBe(false);
    expect(FoodPrefsForm.parse({ ...base, dailyBudgetThb: '150' }).dailyBudgetThb).toBe(150);
  });
});
