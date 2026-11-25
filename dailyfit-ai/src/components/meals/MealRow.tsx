import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LABELS_TH } from '@shared/constants';
import type { MealPlanItemDTO } from '@shared/contracts';

import { AppText } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';

import { FoodImage } from './FoodImage';

/** Compact plan row: round thumbnail, meal label, name, kcal · price, and quick actions. */
export function MealRow({
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
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ดูรายละเอียด ${item.food.name_th}`}
        onPress={() => router.push({ pathname: '/food/[id]', params: { id: item.food.id } })}
        style={styles.main}
      >
        <FoodImage path={item.food.image_path} category={item.food.category} size={64} rounded={32} />
        <View style={styles.text}>
          <AppText variant="caption" color={colors.muted}>
            {LABELS_TH.meal[item.meal_type]}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {item.food.name_th}
          </AppText>
          <AppText variant="caption" color={colors.charcoal} numberOfLines={1}>
            ~{Math.round(item.kcal)} kcal · ฿{item.price_min_thb}–{item.price_max_thb}
          </AppText>
        </View>
      </Pressable>
      {onSwap ? (
        <IconBtn icon={swapping ? 'hourglass-outline' : 'swap-horizontal'} label={`เปลี่ยนเมนู${LABELS_TH.meal[item.meal_type]}`} onPress={onSwap} disabled={swapping} />
      ) : null}
      {onEaten ? (
        eaten ? (
          <View style={[styles.iconBtn, styles.done]} accessibilityLabel="บันทึกแล้ว">
            <Ionicons name="checkmark" size={20} color={colors.white} />
          </View>
        ) : (
          <IconBtn icon={logging ? 'hourglass-outline' : 'checkmark'} label={`บันทึกว่ากิน ${item.food.name_th}`} onPress={onEaten} disabled={logging} outline />
        )
      ) : null}
    </View>
  );
}

function IconBtn({
  icon,
  label,
  onPress,
  disabled,
  outline,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, outline && styles.outline, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={colors.forest} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadow.card,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forestSoft },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.sage },
  done: { backgroundColor: colors.success },
});
