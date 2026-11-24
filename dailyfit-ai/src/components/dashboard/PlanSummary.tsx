import { StyleSheet, View } from 'react-native';

import type { MealPlanDTO } from '@shared/contracts';

import { AppText, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

/** Today's totals vs budget. Deliberately no "over/under" judgement language. */
export function PlanSummary({ plan }: { plan: MealPlanDTO }) {
  const mid = (plan.total_price_min_thb + plan.total_price_max_thb) / 2;
  const pct = Math.min(100, Math.round((mid / plan.budget_thb) * 100));
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View>
          <AppText variant="caption" color={colors.sageLight}>
            พลังงานรวมโดยประมาณ
          </AppText>
          <AppText variant="title" color={colors.white}>
            ~{Math.round(plan.total_kcal).toLocaleString('th-TH')} kcal
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="caption" color={colors.sageLight}>
            โปรตีน
          </AppText>
          <AppText variant="heading" color={colors.white}>
            ~{Math.round(plan.total_protein_g)} g
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={colors.sageLight}>
        ค่าอาหารประมาณ ฿{plan.total_price_min_thb}–{plan.total_price_max_thb} จากงบ ฿{plan.budget_thb}
      </AppText>
      <View style={styles.track} accessibilityLabel={`ใช้งบประมาณประมาณ ${pct}%`}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.forest, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  right: { alignItems: 'flex-end' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
});
