import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useWeeklyProgress } from '@/hooks/useFoodLogs';
import { toAppError } from '@/lib/errors';
import { bangkokToday } from '@/utils/date';

const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const dow = (d: string) => DOW[new Date(`${d}T00:00:00Z`).getUTCDay()]!;

function encouragement(daysLogged: number): string {
  if (daysLogged >= 6) return 'สม่ำเสมอมาก! การจดบันทึกเป็นนิสัยแล้ว';
  if (daysLogged >= 3) return 'ไปได้ดี ลองบันทึกเพิ่มอีกวันสองวันในสัปดาห์หน้านะ';
  if (daysLogged >= 1) return 'เริ่มต้นได้ดีแล้ว ค่อย ๆ เพิ่มทีละนิดก็พอ';
  return 'ยังไม่มีบันทึกในสัปดาห์นี้ ลองบันทึกมื้อต่อไปดูนะ';
}

export default function Progress() {
  const today = bangkokToday();
  const q = useWeeklyProgress(today);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">สรุป 7 วันล่าสุด</AppText>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
        ) : q.data.daysLogged === 0 && q.data.plannedMealsTotal === 0 ? (
          <EmptyState icon="stats-chart-outline" title="ยังไม่มีข้อมูลสัปดาห์นี้" message="เมื่อคุณบันทึกการกินหรือจัดแผนอาหาร สรุปจะแสดงที่นี่" />
        ) : (
          <>
            <Card style={styles.hero}>
              <AppText variant="caption" color={colors.sageLight}>
                ความสม่ำเสมอ
              </AppText>
              <AppText variant="title" color={colors.white}>
                บันทึก {q.data.daysLogged} จาก 7 วัน
              </AppText>
              <View style={styles.dots}>
                {q.data.days.map((d) => (
                  <View key={d.date} style={styles.dotCol}>
                    <View style={[styles.dot, d.logged && styles.dotOn]} />
                    <AppText variant="caption" color={colors.sageLight}>
                      {dow(d.date)}
                    </AppText>
                  </View>
                ))}
              </View>
              <AppText variant="caption" color={colors.white}>
                {encouragement(q.data.daysLogged)}
              </AppText>
            </Card>

            <View style={styles.statsRow}>
              <Stat label="ต่อเนื่อง" value={`${q.data.streak} วัน`} />
              <Stat label="ค่าอาหารเฉลี่ย" value={q.data.avgSpendLoggedDays !== null ? `~฿${q.data.avgSpendLoggedDays}` : '–'} />
              <Stat label="ทำตามแผน" value={q.data.plannedMealsTotal ? `${q.data.plannedMealsEaten}/${q.data.plannedMealsTotal} มื้อ` : '–'} />
            </View>

            <Card style={styles.chartCard}>
              <AppText variant="heading">พลังงานที่บันทึกต่อวัน (ประมาณ)</AppText>
              <Bars values={q.data.days.map((d) => ({ label: dow(d.date), value: d.kcal }))} />
              {q.data.avgKcalLoggedDays !== null ? (
                <AppText variant="caption" color={colors.muted}>
                  เฉลี่ย ~{q.data.avgKcalLoggedDays} kcal ในวันที่บันทึก · วันที่บันทึกไม่ครบทุกมื้ออาจดูต่ำกว่าจริง
                </AppText>
              ) : null}
            </Card>

            {q.data.topFoods.length ? (
              <Card style={styles.chartCard}>
                <AppText variant="heading">เมนูที่กินบ่อย</AppText>
                {q.data.topFoods.map((f, i) => (
                  <View key={f.name} style={styles.topRow}>
                    <AppText color={colors.muted}>{i + 1}.</AppText>
                    <AppText style={styles.flex1}>{f.name}</AppText>
                    <AppText variant="label">{f.count} ครั้ง</AppText>
                  </View>
                ))}
              </Card>
            ) : null}
            <AppText variant="caption" color={colors.muted}>
              สรุปนี้เพื่อช่วยสร้างนิสัยการกินที่ดี ไม่ได้ใช้ประเมินสุขภาพหรือรูปร่าง
            </AppText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </Card>
  );
}

function Bars({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(1, ...values.map((v) => v.value));
  return (
    <View style={styles.bars} accessibilityLabel="กราฟพลังงานรายวัน">
      {values.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <AppText variant="caption" color={colors.muted} style={styles.barValue}>
            {v.value ? Math.round(v.value) : ''}
          </AppText>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${(v.value / max) * 100}%` }]} />
          </View>
          <AppText variant="caption" color={colors.muted}>
            {v.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.forest, gap: spacing.xs },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs },
  dotCol: { alignItems: 'center', gap: 2 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sage },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  statsRow: { flexDirection: 'row', gap: spacing.xs },
  stat: { flex: 1, padding: spacing.sm, gap: 2 },
  chartCard: { gap: spacing.sm },
  bars: { flexDirection: 'row', height: 150, alignItems: 'flex-end', gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 2 },
  barValue: { fontSize: 10, lineHeight: 14 },
  barTrack: { width: '70%', flex: 1, justifyContent: 'flex-end', backgroundColor: colors.cream, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: colors.sage, borderRadius: radius.sm },
  topRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
});
