import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Tone = 'info' | 'warning' | 'error' | 'success';

const TONE: Record<Tone, { bg: string; fg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  info: { bg: colors.forestSoft, fg: colors.forest, icon: 'information-circle-outline' },
  warning: { bg: colors.accentSoft, fg: '#8A5A1F', icon: 'alert-circle-outline' },
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle-outline' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' },
};

export function Banner({ tone = 'info', message }: { tone?: Tone; message: string }) {
  const t = TONE[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Ionicons name={t.icon} size={20} color={t.fg} style={styles.icon} />
      <AppText variant="caption" color={t.fg} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  icon: { marginTop: 1 },
  text: { flex: 1 },
});
