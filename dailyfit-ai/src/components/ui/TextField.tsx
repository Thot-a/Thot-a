import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

// React 19: `ref` is a regular prop and is forwarded via `rest`.
export function TextField({ label, error, hint, suffix, secureTextEntry, style, ...rest }: TextFieldProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.charcoal}>
        {label}
      </AppText>
      <View style={[styles.field, focused && styles.focused, !!error && styles.errored]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...rest}
        />
        {suffix ? <AppText color={colors.muted}>{suffix}</AppText> : null}
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxs },
  field: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  focused: { borderColor: colors.forest },
  errored: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.charcoal, paddingVertical: spacing.sm },
});
