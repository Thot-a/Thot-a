import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'sage' }) {
  const bg = tone === 'accent' ? colors.accentSoft : colors.forestSoft;
  const fg = tone === 'accent' ? '#9A5E1E' : colors.forest;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="caption" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1, alignSelf: 'flex-start' } });
