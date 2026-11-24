import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

export function Stepper({
  value,
  onChange,
  min = 0.5,
  max = 3,
  step = 0.5,
  label = 'จำนวนที่',
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}) {
  const btn = (dir: -1 | 1) => {
    const next = Math.round((value + dir * step) * 100) / 100;
    const blocked = disabled || next < min || next > max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir < 0 ? `ลด${label}` : `เพิ่ม${label}`}
        disabled={blocked}
        onPress={() => onChange(next)}
        hitSlop={8}
        style={[styles.btn, blocked && { opacity: 0.35 }]}
      >
        <Ionicons name={dir < 0 ? 'remove' : 'add'} size={18} color={colors.forest} />
      </Pressable>
    );
  };
  return (
    <View style={styles.row} accessibilityLabel={`${label} ${value}`}>
      {btn(-1)}
      <AppText variant="bodyStrong" style={styles.value}>
        {value}
      </AppText>
      {btn(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  value: { minWidth: 32, textAlign: 'center' },
});
