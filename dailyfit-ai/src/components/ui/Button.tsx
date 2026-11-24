import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const BG: Record<Variant, string> = { primary: colors.forest, secondary: colors.white, ghost: 'transparent', danger: colors.danger };
const FG: Record<Variant, string> = { primary: colors.white, secondary: colors.forest, ghost: colors.forest, danger: colors.white };

export function Button({ label, variant = 'primary', loading, disabled, icon, fullWidth = true, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant], alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        variant === 'secondary' && styles.outline,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText variant="bodyStrong" color={FG[variant]}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 1.5, borderColor: colors.forest },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
