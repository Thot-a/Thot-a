import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** Monday-start week containing `date` (YYYY-MM-DD). */
export function weekOf(date: string): string[] {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - offset + i);
    return x.toISOString().slice(0, 10);
  });
}

export function WeekStrip({
  today,
  selected,
  onSelect,
  marked = [],
}: {
  today: string;
  selected: string;
  onSelect: (d: string) => void;
  marked?: string[];
}) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {weekOf(today).map((d) => {
        const on = d === selected;
        const isToday = d === today;
        const day = new Date(`${d}T00:00:00Z`);
        return (
          <Pressable
            key={d}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${DOW[day.getUTCDay()]} ${day.getUTCDate()}${isToday ? ' วันนี้' : ''}`}
            onPress={() => onSelect(d)}
            style={[styles.day, on && styles.on]}
          >
            <AppText variant="caption" color={on ? colors.sageLight : colors.muted}>
              {DOW[day.getUTCDay()]}
            </AppText>
            <AppText variant="bodyStrong" color={on ? colors.white : colors.charcoal}>
              {day.getUTCDate()}
            </AppText>
            <View style={[styles.dot, marked.includes(d) && { backgroundColor: on ? colors.accent : colors.sage }, isToday && !on && styles.todayRing]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    minHeight: 64,
  },
  on: { backgroundColor: colors.forest },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  todayRing: { borderWidth: 1, borderColor: colors.forest },
});
