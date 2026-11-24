import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  DIETARY_RESTRICTIONS,
  type DietaryRestriction,
  type FoodTag,
  type Goal,
  GOALS,
  LABELS_TH,
} from '@shared/constants';

import { AppText, Banner, Button, Chip, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { firstErrors, FoodPrefsForm } from '@/domain/forms';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';

const DISLIKE: FoodTag[] = ['pork', 'beef', 'chicken', 'seafood', 'egg', 'spicy', 'fried', 'dairy'];
const toggle = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export default function EditSettings() {
  const profile = useProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState message={toAppError(profile.error).message} onRetry={() => profile.refetch()} />;
  return <Form p={profile.data} />;
}

function Form({ p }: { p: NonNullable<ReturnType<typeof useProfile>['data']> }) {
  const [displayName, setDisplayName] = useState(p.displayName ?? '');
  const [goal, setGoal] = useState<Goal>(p.goal);
  const [activity, setActivity] = useState<ActivityLevel>(p.activityLevel);
  const [budget, setBudget] = useState(String(p.dailyBudgetThb));
  const [meals, setMeals] = useState(p.mealsPerDay);
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(p.restrictions);
  const [excluded, setExcluded] = useState<FoodTag[]>(p.excludedTags);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useUpdateProfile();

  const save = () => {
    const parsed = FoodPrefsForm.safeParse({ dailyBudgetThb: budget, mealsPerDay: meals, restrictions, excludedTags: excluded, likedTags: p.likedTags });
    const name = displayName.trim();
    const errs = parsed.success ? {} : firstErrors(parsed.error);
    if (!name || name.length > 50) errs.displayName = 'กรุณากรอกชื่อ (ไม่เกิน 50 ตัวอักษร)';
    if (!parsed.success || Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    m.mutate(
      {
        profile: { displayName: name, goal, activityLevel: activity, dailyBudgetThb: parsed.data.dailyBudgetThb ?? p.dailyBudgetThb },
        preferences: { mealsPerDay: meals, restrictions, excludedTags: excluded },
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Screen edges={['bottom']} footer={<Button label="บันทึก" loading={m.isPending} onPress={save} />}>
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField label="ชื่อ" value={displayName} onChangeText={setDisplayName} error={errors.displayName} maxLength={50} />
      <AppText variant="label">เป้าหมาย</AppText>
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g} label={LABELS_TH.goal[g]} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>
      <AppText variant="label">ระดับกิจกรรม</AppText>
      <View style={styles.chips}>
        {ACTIVITY_LEVELS.map((a) => (
          <Chip key={a} label={LABELS_TH.activity[a]} selected={activity === a} onPress={() => setActivity(a)} />
        ))}
      </View>
      <TextField label="งบค่าอาหารต่อวัน" value={budget} onChangeText={setBudget} keyboardType="number-pad" suffix="บาท" maxLength={4} error={errors.dailyBudgetThb} />
      <AppText variant="label">จำนวนมื้อ</AppText>
      <View style={styles.chips}>
        {[2, 3, 4].map((n) => (
          <Chip key={n} label={n === 4 ? '3 มื้อ + ของว่าง' : `${n} มื้อ`} selected={meals === n} onPress={() => setMeals(n)} />
        ))}
      </View>
      <AppText variant="label">ข้อจำกัดด้านอาหาร</AppText>
      <View style={styles.chips}>
        {DIETARY_RESTRICTIONS.map((r) => (
          <Chip key={r} label={LABELS_TH.restriction[r]} selected={restrictions.includes(r)} onPress={() => setRestrictions((l) => toggle(l, r))} />
        ))}
      </View>
      <AppText variant="label">ไม่อยากกิน</AppText>
      <View style={styles.chips}>
        {DISLIKE.map((t) => (
          <Chip key={t} label={LABELS_TH.tag[t]} selected={excluded.includes(t)} onPress={() => setExcluded((l) => toggle(l, t))} />
        ))}
      </View>
      <AppText variant="caption" color={colors.muted}>
        ข้อมูลร่างกาย (ส่วนสูง น้ำหนัก ปีเกิด) แก้ไขได้ในเวอร์ชันถัดไป
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
