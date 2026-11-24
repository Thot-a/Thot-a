import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LABELS_TH } from '@shared/constants';
import type { MealPlanItemDTO } from '@shared/contracts';

import { MealCard } from '@/components/meals/MealCard';
import { AppText, Banner, Card, EmptyState, ErrorState, LoadingState, SectionHeader, Sheet } from '@/components/ui';
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

export default function Home() {
  const today = bangkokToday();
  const profile = useProfile();
  const plan = useActivePlan(today);
  const logs = useDayLogs(today);
  const generate = useGeneratePlan(today);
  const swap = useSwapMeal(today);
  const addLog = useAddLog();
  const [swapTarget, setSwapTarget] = useState<MealPlanItemDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const eatenIds = new Set((logs.data ?? []).map((l) => l.meal_plan_item_id).filter(Boolean));
  const eatenKcal = (logs.data ?? []).reduce((s, l) => s + l.kcal, 0);
  const actionError = generate.error ?? swap.error ?? addLog.error;
  const name = profile.data?.displayName;

  const markEaten = (item: MealPlanItemDTO) => {
    setBusyId(item.id);
    addLog.mutate(
      { foodId: item.food.id, date: today, mealType: item.meal_type, servingCount: item.serving_count, mealPlanItemId: item.id },
      { onSettled: () => setBusyId(null) },
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <View>
          <AppText variant="caption" color={colors.muted}>
            {formatThaiDate(today)}
          </AppText>
          <AppText variant="title">
            {greetingFor()}
            {name ? ` คุณ${name}` : ''}
          </AppText>
        </View>

        <Card style={styles.hero}>
          <AppText variant="caption" color={colors.sageLight}>
            เป้าหมายวันนี้ · {profile.data ? LABELS_TH.goal[profile.data.goal] : '…'}
          </AppText>
          <View style={styles.heroRow}>
            <Metric label="ตามแผน" value={plan.data ? `~${Math.round(plan.data.total_kcal)}` : '–'} unit="kcal" />
            <Metric label="บันทึกแล้ว" value={`~${Math.round(eatenKcal)}`} unit="kcal" />
            <Metric label="งบต่อวัน" value={`฿${profile.data?.dailyBudgetThb ?? '–'}`} />
          </View>
          {plan.data ? (
            <AppText variant="caption" color={colors.sageLight}>
              ค่าอาหารตามแผนประมาณ ฿{plan.data.total_price_min_thb}–{plan.data.total_price_max_thb}
            </AppText>
          ) : null}
        </Card>

        <View style={styles.quick}>
          <Quick icon="sparkles-outline" label="จัดแผนอาหาร" onPress={() => router.push('/meal/planner')} />
          <Quick icon="add-circle-outline" label="บันทึกอาหาร" onPress={() => router.push({ pathname: '/log/add', params: { date: today } })} />
          <Quick icon="chatbubble-ellipses-outline" label="ถาม AI Coach" onPress={() => router.push('/coach')} />
        </View>

        {actionError ? <Banner tone="error" message={toAppError(actionError).message} /> : null}

        <SectionHeader title="แผนอาหารวันนี้" actionLabel={plan.data ? 'จัดใหม่' : undefined} onAction={() => router.push('/meal/planner')} />

        {plan.isPending ? (
          <LoadingState label="กำลังโหลดแผนอาหารวันนี้…" />
        ) : plan.isError ? (
          <ErrorState message={toAppError(plan.error).message} onRetry={() => plan.refetch()} />
        ) : !plan.data ? (
          <Card>
            <EmptyState
              icon="restaurant-outline"
              title="ยังไม่มีแผนอาหารวันนี้"
              message="ให้เราช่วยจัดเมนูตามเป้าหมายและงบของคุณ ใช้เวลาไม่กี่วินาที"
              actionLabel={generate.isPending ? 'กำลังจัดเมนู…' : 'จัดเมนูวันนี้'}
              onAction={generate.isPending ? undefined : () => generate.mutate()}
            />
          </Card>
        ) : (
          <>
            {plan.data.uses_sample_data ? (
              <Banner tone="warning" message="ข้อมูลตัวอย่าง: ตัวเลขโภชนาการยังไม่ผ่านการตรวจสอบ ใช้เพื่อดูการทำงานของแอปเท่านั้น" />
            ) : null}
            {plan.data.items.map((item) => (
              <MealCard
                key={item.id}
                item={item}
                onSwap={() => setSwapTarget(item)}
                swapping={swap.isPending && swap.variables?.itemId === item.id}
                onEaten={() => markEaten(item)}
                eaten={eatenIds.has(item.id)}
                logging={busyId === item.id}
              />
            ))}
          </>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push('/diary')} style={styles.diaryLink}>
          <Ionicons name="book-outline" size={20} color={colors.forest} />
          <AppText style={styles.flex1}>
            วันนี้บันทึกแล้ว {logs.data?.length ?? 0} รายการ
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <AppText variant="caption" color={colors.muted}>
          ตัวเลขทั้งหมดเป็นค่าประมาณ ราคาอาจต่างกันในแต่ละร้าน และไม่ใช่คำแนะนำทางการแพทย์
        </AppText>
      </ScrollView>

      <Sheet
        visible={!!swapTarget}
        title="อยากเปลี่ยนเป็นแบบไหน"
        message={swapTarget ? `${LABELS_TH.meal[swapTarget.meal_type]}: ${swapTarget.food.name_th}` : undefined}
        onClose={() => setSwapTarget(null)}
        options={SWAP_OPTIONS.map((o) => ({
          label: o.label,
          onPress: () => swapTarget && swap.mutate({ itemId: swapTarget.id, reason: o.reason }),
        }))}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption" color={colors.sageLight}>
        {label}
      </AppText>
      <AppText variant="heading" color={colors.white}>
        {value}
        {unit ? <AppText variant="caption" color={colors.sageLight}>{` ${unit}`}</AppText> : null}
      </AppText>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.8 }]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.forest} />
      </View>
      <AppText variant="caption" align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.forest, gap: spacing.xs },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { gap: 0 },
  quick: { flexDirection: 'row', gap: spacing.sm },
  quickItem: { flex: 1, alignItems: 'center', gap: spacing.xxs, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: spacing.sm },
  quickIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center' },
  diaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
