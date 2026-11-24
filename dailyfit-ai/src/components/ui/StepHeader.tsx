import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

export function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`ขั้นตอนที่ ${step} จาก ${total}`}
        accessibilityValue={{ min: 0, max: total, now: step }}
      >
        <View style={[styles.fill, { width: `${(step / total) * 100}%` }]} />
      </View>
      <AppText variant="caption" color={colors.muted}>
        ขั้นตอน {step}/{total}
      </AppText>
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText color={colors.muted}>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.sageLight, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.forest, borderRadius: radius.pill },
});
