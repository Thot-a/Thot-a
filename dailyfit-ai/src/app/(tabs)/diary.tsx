import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LABELS_TH, MEAL_TYPES } from '@shared/constants';

import { FoodImage } from '@/components/meals/FoodImage';
import { AppText, Banner, Card, ErrorState, LoadingState, Sheet, Stepper } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useDayLogs, useDeleteLog, useUpdateLog } from '@/hooks/useFoodLogs';
import { toAppError } from '@/lib/errors';
import type { FoodLog } from '@/types/models';
import { bangkokToday, formatThaiDate } from '@/utils/date';

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function Diary() {
  const today = bangkokToday();
  const [date, setDate] = useState(today);
  const logs = useDayLogs(date);
  const update = useUpdateLog();
  const del = useDeleteLog();
  const [toDelete, setToDelete] = useState<FoodLog | null>(null);

  const totals = (logs.data ?? []).reduce(
    (s, l) => ({ kcal: s.kcal + l.kcal, p: s.p + l.protein_g, c: s.c + l.carbs_g, f: s.f + l.fat_g }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">บันทึกการกิน</AppText>
        <View style={styles.dateNav}>
          <NavBtn icon="chevron-back" label="วันก่อนหน้า" onPress={() => setDate(shift(date, -1))} />
          <AppText variant="bodyStrong" align="center" style={styles.flex1}>
            {date === today ? 'วันนี้ · ' : ''}
            {formatThaiDate(date)}
          </AppText>
          <NavBtn icon="chevron-forward" label="วันถัดไป" onPress={() => setDate(shift(date, 1))} disabled={date >= today} />
        </View>

        <Card style={styles.totals}>
          <Total label="พลังงาน" value={`~${Math.round(totals.kcal)}`} unit="kcal" />
          <Total label="โปรตีน" value={`~${Math.round(totals.p)}`} unit="g" />
          <Total label="คาร์บ" value={`~${Math.round(totals.c)}`} unit="g" />
          <Total label="ไขมัน" value={`~${Math.round(totals.f)}`} unit="g" />
        </Card>

        {update.isError || del.isError ? <Banner tone="error" message={toAppError(update.error ?? del.error).message} /> : null}

        {logs.isPending ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState message={toAppError(logs.error).message} onRetry={() => logs.refetch()} />
        ) : (
          MEAL_TYPES.map((m) => {
            const entries = (logs.data ?? []).filter((l) => l.meal_type === m);
            return (
              <View key={m} style={styles.section}>
                <View style={styles.sectionHead}>
                  <AppText variant="heading">{LABELS_TH.meal[m]}</AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`เพิ่ม${LABELS_TH.meal[m]}`}
                    hitSlop={10}
                    onPress={() => router.push({ pathname: '/log/add', params: { date, meal: m } })}
                    style={styles.addBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.forest} />
                    <AppText variant="label" color={colors.forest}>
                      เพิ่ม
                    </AppText>
                  </Pressable>
                </View>
                {entries.length === 0 ? (
                  <AppText variant="caption" color={colors.muted}>
                    ยังไม่มีรายการ
                  </AppText>
                ) : (
                  entries.map((l) => (
                    <Card key={l.id} style={styles.entry}>
                      <FoodImage path={l.food.image_path} category={l.food.category} size={48} />
                      <View style={styles.flex1}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {l.food.name_th}
                        </AppText>
                        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
                          ~{Math.round(l.kcal)} kcal
                        </AppText>
                      </View>
                      <Stepper
                        value={l.serving_count}
                        min={0.5}
                        max={5}
                        disabled={update.isPending}
                        onChange={(v) => update.mutate({ id: l.id, servingCount: v })}
                      />
                      <Pressable accessibilityRole="button" accessibilityLabel={`ลบ ${l.food.name_th}`} hitSlop={10} onPress={() => setToDelete(l)}>
                        <Ionicons name="trash-outline" size={20} color={colors.muted} />
                      </Pressable>
                    </Card>
                  ))
                )}
              </View>
            );
          })
        )}
        <AppText variant="caption" color={colors.muted}>
          ตัวเลขเป็นค่าประมาณจากฐานข้อมูลเมนู
        </AppText>
      </ScrollView>
      <Sheet
        visible={!!toDelete}
        title="ลบรายการนี้?"
        message={toDelete?.food.name_th}
        onClose={() => setToDelete(null)}
        options={[{ label: 'ลบรายการ', destructive: true, onPress: () => toDelete && del.mutate(toDelete.id) }]}
      />
    </SafeAreaView>
  );
}

function NavBtn({ icon, label, onPress, disabled }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} hitSlop={8} style={[styles.navBtn, disabled && { opacity: 0.3 }]}>
      <Ionicons name={icon} size={20} color={colors.forest} />
    </Pressable>
  );
}

function Total({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.total}>
      <AppText variant="caption" color={colors.sageLight}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={colors.white}>
        {value}
        <AppText variant="caption" color={colors.sageLight}>{` ${unit}`}</AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  totals: { backgroundColor: colors.forest, flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'flex-start' },
  section: { gap: spacing.xs },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.forestSoft },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
});
