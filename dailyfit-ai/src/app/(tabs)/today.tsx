import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LABELS_TH } from '@shared/constants';
import type { MealPlanItemDTO } from '@shared/contracts';

import { EnergyRing } from '@/components/dashboard/EnergyRing';
import { HeroHeader } from '@/components/dashboard/HeroHeader';
import { WeekStrip } from '@/components/dashboard/WeekStrip';
import { MealRow } from '@/components/meals/MealRow';
import { AppText, Banner, Button, Card, ErrorState, LoadingState, Pill, Sheet } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAddLog, useDayLogs } from '@/hooks/useFoodLogs';
import { useActivePlan, useGeneratePlan, useSwapMeal } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import type { SwapReason } from '@/services/mealPlans';
import { bangkokToday, formatThaiDate, greetingFor } from '@/utils/date';

const SWAP_OPTIONS: { reason: SwapReason; label: string }[] = [
  { reason: 'dislike', label: 'ขอเมนูอื่น' },
  { reason: 'cheaper', label: 'ถูกกว่านี้' },
  { reason: 'lighter', label: 'เบากว่านี้' },
  { reason: 'more_protein', label: 'โปรตีนมากขึ้น' },
];

export default function Today() {
  const today = bangkokToday();
  const [date, setDate] = useState(today);
  const isToday = date === today;
  const isFuture = date > today;
  const profile = useProfile();
  const plan = useActivePlan(date);
  const logs = useDayLogs(date);
  const generate = useGeneratePlan(date);
  const swap = useSwapMeal(date);
  const addLog = useAddLog();
  const [swapTarget, setSwapTarget] = useState<MealPlanItemDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const eaten = (logs.data ?? []).reduce(
    (s, l) => ({ kcal: s.kcal + l.kcal, p: s.p + l.protein_g, c: s.c + l.carbs_g, f: s.f + l.fat_g }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const eatenIds = new Set((logs.data ?? []).map((l) => l.meal_plan_item_id).filter(Boolean));
  const actionError = generate.error ?? swap.error ?? addLog.error;
  const p = plan.data;

  const markEaten = (item: MealPlanItemDTO) => {
    setBusyId(item.id);
    addLog.mutate(
      { foodId: item.food.id, date, mealType: item.meal_type, servingCount: item.serving_count, mealPlanItemId: item.id },
      { onSettled: () => setBusyId(null) },
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={plan.isRefetching || logs.isRefetching}
            onRefresh={() => {
              void plan.refetch();
              void logs.refetch();
            }}
            tintColor={colors.forest}
          />
        }
      >
        <HeroHeader greeting={greetingFor()} name={profile.data?.displayName ?? null} subtitle={formatThaiDate(today)} />

        <View style={styles.content}>
          <WeekStrip today={today} selected={date} onSelect={setDate} />

          <EnergyRing
            eatenKcal={eaten.kcal}
            plannedKcal={p ? p.total_kcal : null}
            macros={[
              { label: 'โปรตีน', eaten: eaten.p, planned: p?.total_protein_g ?? 0, color: colors.accent },
              { label: 'คาร์โบไฮเดรต', eaten: eaten.c, planned: p?.total_carbs_g ?? 0, color: colors.sage },
              { label: 'ไขมัน', eaten: eaten.f, planned: p?.total_fat_g ?? 0, color: '#F3D3A6' },
            ]}
            footer={
              p
                ? `ค่าอาหารตามแผน ~฿${p.total_price_min_thb}–${p.total_price_max_thb} · งบ ฿${p.budget_thb}`
                : `งบค่าอาหาร ฿${profile.data?.dailyBudgetThb ?? '–'}/วัน · ${profile.data ? LABELS_TH.goal[profile.data.goal] : ''}`
            }
          />

          <View style={styles.tiles}>
            <Tile
              bg={colors.sageLight}
              icon="silverware-fork-knife"
              title="จัดแผนอาหาร"
              body="ตามงบและเป้าหมาย"
              onPress={() => router.push({ pathname: '/meal/planner', params: { date } })}
            />
            <Tile bg={colors.accentSoft} icon="book-open-page-variant-outline" title="คลังเมนู" body="ดูเมนูทั้งหมด" onPress={() => router.push('/foods')} />
            <Tile bg="#E6E3F1" icon="chat-processing-outline" title="ถามโค้ช" body="ปรึกษาเรื่องกิน" onPress={() => router.push('/coach')} />
          </View>

          {actionError ? <Banner tone="error" message={toAppError(actionError).message} /> : null}

          <View style={styles.sectionHead}>
            <View style={styles.flex1}>
              <AppText variant="heading">{isToday ? 'มื้ออาหารวันนี้' : `มื้ออาหาร ${formatThaiDate(date).replace(/^วัน/, '')}`}</AppText>
              {p ? <Pill label={p.generated_by === 'ai' ? '✦ จัดโดย AI' : '✦ จัดอัตโนมัติ'} /> : null}
            </View>
            {p ? (
              <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push({ pathname: '/meal/planner', params: { date } })}>
                <AppText variant="label" color={colors.forest}>
                  จัดใหม่
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {plan.isPending ? (
            <LoadingState label="กำลังโหลดแผนอาหาร…" />
          ) : plan.isError ? (
            <ErrorState message={toAppError(plan.error).message} onRetry={() => plan.refetch()} />
          ) : !p ? (
            <Card style={styles.empty}>
              <MaterialCommunityIcons name="silverware-clean" size={36} color={colors.sage} />
              <AppText variant="bodyStrong" align="center">
                {isToday ? 'ยังไม่มีแผนอาหารวันนี้' : 'ยังไม่มีแผนอาหารสำหรับวันที่เลือก'}
              </AppText>
              <AppText variant="caption" color={colors.muted} align="center">
                ให้เราจัดเมนูตามเป้าหมายและงบของคุณ ใช้เวลาไม่กี่วินาที
              </AppText>
              <Button label="จัดเมนูให้ฉัน" loading={generate.isPending} onPress={() => generate.mutate()} fullWidth={false} />
            </Card>
          ) : (
            <>
              {p.uses_sample_data ? (
                <Banner tone="warning" message="ข้อมูลตัวอย่าง: ตัวเลขโภชนาการยังไม่ผ่านการตรวจสอบ ใช้เพื่อดูการทำงานของแอปเท่านั้น" />
              ) : null}
              {p.items.map((item) => (
                <MealRow
                  key={item.id}
                  item={item}
                  onSwap={() => setSwapTarget(item)}
                  swapping={swap.isPending && swap.variables?.itemId === item.id}
                  onEaten={isFuture ? undefined : () => markEaten(item)}
                  eaten={eatenIds.has(item.id)}
                  logging={busyId === item.id}
                />
              ))}
            </>
          )}

          <Pressable accessibilityRole="button" onPress={() => router.push('/progress')} style={styles.link}>
            <Ionicons name="stats-chart-outline" size={20} color={colors.forest} />
            <AppText style={styles.flex1}>ดูสรุปความสม่ำเสมอ 7 วัน</AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>

          <AppText variant="caption" color={colors.muted}>
            ตัวเลขทั้งหมดเป็นค่าประมาณ ราคาอาจต่างกันในแต่ละร้าน และไม่ใช่คำแนะนำทางการแพทย์
          </AppText>
        </View>
      </ScrollView>

      <Sheet
        visible={!!swapTarget}
        title="อยากเปลี่ยนเป็นแบบไหน"
        message={swapTarget ? `${LABELS_TH.meal[swapTarget.meal_type]}: ${swapTarget.food.name_th}` : undefined}
        onClose={() => setSwapTarget(null)}
        options={SWAP_OPTIONS.map((o) => ({ label: o.label, onPress: () => swapTarget && swap.mutate({ itemId: swapTarget.id, reason: o.reason }) }))}
      />
    </SafeAreaView>
  );
}

function Tile({
  bg,
  icon,
  title,
  body,
  onPress,
}: {
  bg: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}>
      <View style={styles.tileIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.forest} />
      </View>
      <AppText variant="label">{title}</AppText>
      <AppText variant="caption" color={colors.muted} numberOfLines={1}>
        {body}
      </AppText>
      <Ionicons name="arrow-forward" size={16} color={colors.forest} style={styles.tileArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1, gap: 4 },
  scroll: { paddingBottom: spacing.xxl },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.xs },
  tile: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, gap: 2, minHeight: 118 },
  tileIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileArrow: { marginTop: 'auto' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end' },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
});
