import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LABELS_TH } from '@shared/constants';
import type { MealPlanItemDTO } from '@shared/contracts';

import { AppText, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

import { FoodImage } from './FoodImage';

const MEAL_ICON = { breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snack: 'cafe-outline' } as const;

export function MealCard({
  item,
  onSwap,
  swapping,
  onEaten,
  eaten,
  logging,
}: {
  item: MealPlanItemDTO;
  onSwap?: () => void;
  swapping?: boolean;
  onEaten?: () => void;
  eaten?: boolean;
  logging?: boolean;
}) {
  const serving = item.serving_count === 1 ? item.food.serving_description_th : `${item.serving_count} × ${item.food.serving_description_th}`;
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ดูรายละเอียด ${item.food.name_th}`}
        onPress={() => router.push({ pathname: '/food/[id]', params: { id: item.food.id } })}
        style={styles.top}
      >
        <FoodImage path={item.food.image_path} category={item.food.category} size={84} />
        <View style={styles.info}>
          <View style={styles.mealTag}>
            <Ionicons name={MEAL_ICON[item.meal_type]} size={14} color={colors.forest} />
            <AppText variant="caption" color={colors.forest}>
              {LABELS_TH.meal[item.meal_type]}
            </AppText>
          </View>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {item.food.name_th}
          </AppText>
          <AppText variant="caption" color={colors.muted} numberOfLines={1}>
            {serving}
          </AppText>
          <AppText variant="caption" color={colors.charcoal}>
            ~{Math.round(item.kcal)} kcal · โปรตีน ~{Math.round(item.protein_g)} g · ฿{item.price_min_thb}–{item.price_max_thb}
          </AppText>
        </View>
      </Pressable>
      {item.reason_th ? (
        <AppText variant="caption" color={colors.muted} style={styles.reason}>
          {item.reason_th}
        </AppText>
      ) : null}
      {onSwap || onEaten ? (
        <View style={styles.actions}>
          {onSwap ? (
            <Action icon="swap-horizontal" label={swapping ? 'กำลังเปลี่ยน…' : 'เปลี่ยนเมนู'} onPress={onSwap} disabled={swapping} />
          ) : null}
          {onEaten ? (
            eaten ? (
              <View style={[styles.action, styles.done]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <AppText variant="label" color={colors.success}>
                  บันทึกแล้ว
                </AppText>
              </View>
            ) : (
              <Action icon="checkmark-circle-outline" label={logging ? 'กำลังบันทึก…' : 'กินแล้ว'} onPress={onEaten} disabled={logging} primary />
            )
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.action, primary && styles.primary, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={primary ? colors.white : colors.forest} />
      <AppText variant="label" color={primary ? colors.white : colors.forest}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  top: { flexDirection: 'row', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  mealTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reason: { fontStyle: 'normal' },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.sageLight,
  },
  primary: { backgroundColor: colors.forest, borderColor: colors.forest },
  done: { borderColor: colors.successSoft, backgroundColor: colors.successSoft },
});
