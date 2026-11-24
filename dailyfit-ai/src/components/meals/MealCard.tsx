import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MealPlanItemDTO } from '@shared/contracts';
import { LABELS_TH } from '@shared/constants';

import { AppText, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

const MEAL_ICON = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' } as const;

export function MealCard({ item, onSwap, swapping }: { item: MealPlanItemDTO; onSwap?: () => void; swapping?: boolean }) {
  const serving = item.serving_count === 1 ? item.food.serving_description_th : `${item.serving_count} × ${item.food.serving_description_th}`;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.mealTag}>
          <Ionicons name={MEAL_ICON[item.meal_type]} size={16} color={colors.forest} />
          <AppText variant="label" color={colors.forest}>
            {LABELS_TH.meal[item.meal_type]}
          </AppText>
        </View>
        {onSwap ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`เปลี่ยนเมนู${LABELS_TH.meal[item.meal_type]}`}
            onPress={onSwap}
            disabled={swapping}
            hitSlop={10}
            style={({ pressed }) => [styles.swap, (pressed || swapping) && { opacity: 0.6 }]}
          >
            <Ionicons name="swap-horizontal" size={16} color={colors.forest} />
            <AppText variant="caption" color={colors.forest}>
              {swapping ? 'กำลังเปลี่ยน…' : 'เปลี่ยนเมนู'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText variant="heading">{item.food.name_th}</AppText>
      <AppText variant="caption" color={colors.muted}>
        {serving}
      </AppText>
      {item.reason_th ? <AppText variant="caption">{item.reason_th}</AppText> : null}
      <View style={styles.stats}>
        <Stat label="พลังงาน" value={`~${Math.round(item.kcal)} kcal`} />
        <Stat label="โปรตีน" value={`~${Math.round(item.protein_g)} g`} />
        <Stat label="คาร์บ" value={`~${Math.round(item.carbs_g)} g`} />
        <Stat label="ไขมัน" value={`~${Math.round(item.fat_g)} g`} />
      </View>
      <AppText variant="label" color={colors.charcoal}>
        ราคาประมาณ ฿{item.price_min_thb}–{item.price_max_thb}
      </AppText>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xxs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.forestSoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, marginBottom: spacing.xxs },
  stat: { alignItems: 'flex-start' },
});
