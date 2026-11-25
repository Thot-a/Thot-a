import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';

/** Calm illustrated landscape (drawn in code — no photo needed) behind the greeting. */
export function HeroHeader({ greeting, name, subtitle }: { greeting: string; name: string | null; subtitle: string }) {
  return (
    <View style={styles.wrap}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 210" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E9EFE4" />
            <Stop offset="1" stopColor={colors.cream} />
          </LinearGradient>
          <LinearGradient id="far" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C9D6C4" />
            <Stop offset="1" stopColor="#DCE5D7" />
          </LinearGradient>
          <LinearGradient id="near" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.sage} />
            <Stop offset="1" stopColor="#C3D2BF" />
          </LinearGradient>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.cream} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.cream} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="390" height="210" fill="url(#sky)" />
        <Circle cx="300" cy="78" r="26" fill="#F3D3A6" opacity="0.9" />
        <Path d="M0 150 L70 104 L120 132 L190 86 L250 128 L310 98 L390 140 L390 210 L0 210 Z" fill="url(#far)" />
        <Path d="M0 172 L60 140 L130 166 L200 128 L270 164 L330 146 L390 170 L390 210 L0 210 Z" fill="url(#near)" opacity="0.85" />
        <Path d="M0 186 Q100 178 200 186 T390 184 L390 210 L0 210 Z" fill="#B7C8B2" opacity="0.5" />
        <Rect x="0" y="150" width="390" height="60" fill="url(#fade)" />
      </Svg>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.muted}>
            {subtitle}
          </AppText>
          <AppText variant="heading" color={colors.muted}>
            {greeting}
          </AppText>
          <AppText variant="display">{name ?? 'คุณ'}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="โปรไฟล์และการตั้งค่า"
          onPress={() => router.push('/profile')}
          style={styles.avatar}
          hitSlop={8}
        >
          <AppText variant="bodyStrong" color={colors.white}>
            {(name ?? '?').slice(0, 1)}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 210, paddingHorizontal: spacing.lg, paddingTop: spacing.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, gap: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
