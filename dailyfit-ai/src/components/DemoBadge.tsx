import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { DEMO_MODE } from '@/lib/demo';

/** Always-visible marker so demo data can never be mistaken for real data. */
export function DemoBadge() {
  const insets = useSafeAreaInsets();
  if (!DEMO_MODE) return null;
  return (
    <View pointerEvents="none" style={[styles.badge, { top: insets.top + 4 }]} accessibilityRole="text" accessibilityLabel="โหมดตัวอย่าง ข้อมูลไม่ใช่ข้อมูลจริง">
      <AppText variant="caption" color={colors.charcoal} style={styles.text}>
        โหมดตัวอย่าง
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 1,
    opacity: 0.95,
  },
  text: { fontSize: 11, lineHeight: 18 },
});
