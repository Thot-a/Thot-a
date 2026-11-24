import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type FoodTag, type Goal, GOALS, LABELS_TH } from '@shared/constants';
import type { MealPlanItemDTO } from '@shared/contracts';

import { MealCard } from '@/components/meals/MealCard';
import { AppText, Banner, Button, Card, Chip, Screen, Sheet, TextField } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useGeneratePlan, useSwapMeal } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import type { SwapReason } from '@/services/mealPlans';
import { bangkokToday } from '@/utils/date';

const BUDGETS = [100, 150, 200, 300];
const AVOID: FoodTag[] = ['pork', 'beef', 'seafood', 'spicy', 'fried', 'dairy'];
const SWAP_OPTIONS: { reason: SwapReason; label: string }[] = [
  { reason: 'dislike', label: 'ขอเมนูอื่น' },
  { reason: 'cheaper', label: 'ถูกกว่านี้' },
  { reason: 'lighter', label: 'เบากว่านี้' },
  { reason: 'more_protein', label: 'โปรตีนมากขึ้น' },
];

export default function Planner() {
  const today = bangkokToday();
  const { data: profile } = useProfile();
  const [budget, setBudget] = useState(profile?.dailyBudgetThb ?? 150);
  const [custom, setCustom] = useState('');
  const [meals, setMeals] = useState(profile?.mealsPerDay ?? 3);
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'healthy_lifestyle');
  const [avoid, setAvoid] = useState<FoodTag[]>(profile?.excludedTags ?? []);
  const [customError, setCustomError] = useState<string>();
  const [swapTarget, setSwapTarget] = useState<MealPlanItemDTO | null>(null);
  const generate = useGeneratePlan(today);
  const swap = useSwapMeal(today);
  const plan = swap.data?.plan.id === generate.data?.plan.id && swap.data ? swap.data.plan : generate.data?.plan;

  const run = () => {
    let b = budget;
    if (custom.trim()) {
      const n = Number(custom);
      if (!Number.isInteger(n) || n < 30 || n > 2000) return setCustomError('งบ 30–2,000 บาท');
      b = n;
    }
    setCustomError(undefined);
    swap.reset();
    generate.mutate({ budgetThb: b, mealsPerDay: meals, goal, excludedTags: avoid });
  };

  return (
    <Screen edges={['bottom']}>
      <AppText color={colors.muted}>ตั้งเงื่อนไขสำหรับวันนี้ แล้วให้เราเลือกเมนูให้ แผนใหม่จะแทนแผนเดิมของวันนี้</AppText>

      <AppText variant="label">งบประมาณวันนี้</AppText>
      <View style={styles.chips}>
        {BUDGETS.map((b) => (
          <Chip key={b} label={`฿${b}`} selected={!custom && budget === b} onPress={() => { setCustom(''); setBudget(b); }} />
        ))}
      </View>
      <TextField label="หรือกำหนดเอง" value={custom} onChangeText={setCustom} keyboardType="number-pad" suffix="บาท" maxLength={4} error={customError} placeholder="เช่น 180" />

      <AppText variant="label">จำนวนมื้อ</AppText>
      <View style={styles.chips}>
        {[2, 3, 4].map((n) => (
          <Chip key={n} label={n === 4 ? '3 มื้อ + ของว่าง' : `${n} มื้อ`} selected={meals === n} onPress={() => setMeals(n)} />
        ))}
      </View>

      <AppText variant="label">เป้าหมาย</AppText>
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g} label={LABELS_TH.goal[g]} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>

      <AppText variant="label">วันนี้ไม่อยากกิน</AppText>
      <View style={styles.chips}>
        {AVOID.map((t) => (
          <Chip key={t} label={LABELS_TH.tag[t]} selected={avoid.includes(t)} onPress={() => setAvoid((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))} />
        ))}
      </View>

      <Button label={plan ? 'จัดเมนูใหม่อีกครั้ง' : 'จัดเมนูให้ฉัน'} loading={generate.isPending} onPress={run} />
      {generate.isError || swap.isError ? <Banner tone="error" message={toAppError(generate.error ?? swap.error).message} /> : null}

      {plan ? (
        <>
          <Banner tone="success" message={`บันทึกเป็นแผนของวันนี้แล้ว · ใช้สิทธิ์จัดเมนู ${generate.data?.quota.used}/${generate.data?.quota.limit} ครั้งวันนี้`} />
          <Card style={styles.summary}>
            <AppText variant="heading" color={colors.white}>
              ~{Math.round(plan.total_kcal)} kcal · โปรตีน ~{Math.round(plan.total_protein_g)} g
            </AppText>
            <AppText variant="caption" color={colors.sageLight}>
              ค่าอาหารประมาณ ฿{plan.total_price_min_thb}–{plan.total_price_max_thb} จากงบ ฿{plan.budget_thb}
            </AppText>
            {plan.summary_th ? (
              <AppText variant="caption" color={colors.white}>
                {plan.summary_th}
              </AppText>
            ) : null}
          </Card>
          {plan.items.map((item) => (
            <MealCard key={item.id} item={item} onSwap={() => setSwapTarget(item)} swapping={swap.isPending && swap.variables?.itemId === item.id} />
          ))}
        </>
      ) : null}

      <Sheet
        visible={!!swapTarget}
        title="อยากเปลี่ยนเป็นแบบไหน"
        onClose={() => setSwapTarget(null)}
        options={SWAP_OPTIONS.map((o) => ({ label: o.label, onPress: () => swapTarget && swap.mutate({ itemId: swapTarget.id, reason: o.reason }) }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summary: { backgroundColor: colors.forest, gap: spacing.xxs },
});
