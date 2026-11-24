import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  DIETARY_RESTRICTIONS,
  type DietaryRestriction,
  type FoodTag,
  LABELS_TH,
  RESTRICTIONS_NEEDING_CAUTION,
} from '@shared/constants';

import { AppText, Banner, Button, Chip, Screen, StepHeader, TextField } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { firstErrors, FoodPrefsForm } from '@/domain/forms';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';

const DISLIKE_OPTIONS: FoodTag[] = ['pork', 'beef', 'chicken', 'seafood', 'egg', 'spicy', 'fried', 'dairy'];
const LIKE_OPTIONS: FoodTag[] = ['rice', 'noodle', 'soup', 'high_protein', 'quick', 'convenience_store', 'street_food'];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FoodStep() {
  const { data: profile } = useProfile();
  const [budget, setBudget] = useState(String(profile?.dailyBudgetThb ?? 150));
  const [meals, setMeals] = useState(profile?.mealsPerDay ?? 3);
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(profile?.restrictions ?? []);
  const [excluded, setExcluded] = useState<FoodTag[]>(profile?.excludedTags ?? []);
  const [liked, setLiked] = useState<FoodTag[]>(profile?.likedTags ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useUpdateProfile();

  const submit = () => {
    const parsed = FoodPrefsForm.safeParse({ dailyBudgetThb: budget, mealsPerDay: meals, restrictions, excludedTags: excluded, likedTags: liked });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});
    const d = parsed.data;
    // Completing onboarding flips the root guard to the main tabs.
    m.mutate({
      preferences: { mealsPerDay: d.mealsPerDay, restrictions: d.restrictions, excludedTags: d.excludedTags, likedTags: d.likedTags },
      profile: { dailyBudgetThb: d.dailyBudgetThb ?? 150, onboardingCompleted: true },
    });
  };

  const needsCaution = restrictions.some((r) => RESTRICTIONS_NEEDING_CAUTION.includes(r));

  return (
    <Screen edges={['bottom']} footer={<Button label="เสร็จแล้ว เริ่มใช้งาน" loading={m.isPending} onPress={submit} />}>
      <StepHeader step={4} total={4} title="เรื่องกินของคุณ" subtitle="ใช้จัดเมนูให้ตรงใจและตรงงบ" />
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField
        label="งบค่าอาหารต่อวัน"
        value={budget}
        onChangeText={setBudget}
        error={errors.dailyBudgetThb}
        keyboardType="number-pad"
        suffix="บาท"
        maxLength={4}
      />
      <AppText variant="label">จำนวนมื้อต่อวัน</AppText>
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
      {needsCaution ? (
        <Banner
          tone="warning"
          message="เรากรองเมนูจากข้อมูลวัตถุดิบหลักเท่านั้น หากคุณแพ้อาหารหรือมีข้อกำหนดทางศาสนา โปรดสอบถามร้านค้าทุกครั้ง"
        />
      ) : null}
      <AppText variant="label">ไม่อยากกิน</AppText>
      <View style={styles.chips}>
        {DISLIKE_OPTIONS.map((t) => (
          <Chip key={t} label={LABELS_TH.tag[t]} selected={excluded.includes(t)} onPress={() => setExcluded((l) => toggle(l, t))} />
        ))}
      </View>
      <AppText variant="label">ชอบเป็นพิเศษ</AppText>
      <View style={styles.chips}>
        {LIKE_OPTIONS.map((t) => (
          <Chip key={t} label={LABELS_TH.tag[t]} selected={liked.includes(t)} onPress={() => setLiked((l) => toggle(l, t))} />
        ))}
      </View>
      <AppText variant="caption" color={colors.muted}>
        หากมีโรคประจำตัวหรือต้องควบคุมอาหารเฉพาะทาง แนะนำให้ปรึกษาแพทย์หรือนักกำหนดอาหาร
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
