import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MealPlanItemDTO } from '@shared/contracts';
import { LABELS_TH } from '@shared/constants';

import { PlanSummary } from '@/components/dashboard/PlanSummary';
import { MealCard } from '@/components/meals/MealCard';
import { AppText, Banner, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan, useGeneratePlan, useSwapMeal } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import { bangkokToday, formatThaiDate, greetingFor } from '@/utils/date';

type SwapReason = 'dislike' | 'cheaper' | 'lighter' | 'more_protein';
const SWAP_OPTIONS: { reason: SwapReason; label: string }[] = [
  { reason: 'dislike', label: 'ขอเมนูอื่น' },
  { reason: 'cheaper', label: 'ถูกกว่านี้' },
  { reason: 'lighter', label: 'เบากว่านี้' },
  { reason: 'more_protein', label: 'โปรตีนมากขึ้น' },
];

function askSwapReason(onPick: (r: SwapReason) => void) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...SWAP_OPTIONS.map((o) => o.label), 'ยกเลิก'], cancelButtonIndex: SWAP_OPTIONS.length, title: 'อยากเปลี่ยนเป็นแบบไหน' },
      (i) => {
        const o = SWAP_OPTIONS[i];
        if (o) onPick(o.reason);
      },
    );
  } else {
    Alert.alert('อยากเปลี่ยนเป็นแบบไหน', undefined, [
      ...SWAP_OPTIONS.slice(0, 2).map((o) => ({ text: o.label, onPress: () => onPick(o.reason) })),
      { text: 'ยกเลิก', style: 'cancel' as const },
    ]);
  }
}

export default function Home() {
  const today = bangkokToday();
  const profile = useProfile();
  const plan = useActivePlan(today);
  const generate = useGeneratePlan(today);
  const swap = useSwapMeal(today);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const onSwap = (item: MealPlanItemDTO) =>
    askSwapReason((reason) => {
      setSwappingId(item.id);
      swap.mutate({ itemId: item.id, reason }, { onSettled: () => setSwappingId(null) });
    });

  const name = profile.data?.displayName;
  const actionError = generate.error ?? swap.error;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={plan.isRefetching} onRefresh={() => void plan.refetch()} tintColor={colors.forest} />}
      >
        <View>
          <AppText variant="caption" color={colors.muted}>
            {formatThaiDate(today)}
          </AppText>
          <AppText variant="title">
            {greetingFor()}
            {name ? ` คุณ${name}` : ''}
          </AppText>
          {profile.data ? (
            <AppText color={colors.muted}>
              เป้าหมาย: {LABELS_TH.goal[profile.data.goal]} · งบ ฿{profile.data.dailyBudgetThb}/วัน
            </AppText>
          ) : null}
        </View>

        {actionError ? <Banner tone="error" message={toAppError(actionError).message} /> : null}

        {plan.isPending ? (
          <LoadingState label="กำลังโหลดแผนอาหารวันนี้…" />
        ) : plan.isError ? (
          <ErrorState message={toAppError(plan.error).message} onRetry={() => plan.refetch()} />
        ) : !plan.data ? (
          <EmptyState
            icon="restaurant-outline"
            title="ยังไม่มีแผนอาหารวันนี้"
            message="ให้เราช่วยจัดเมนูตามเป้าหมายและงบของคุณ ใช้เวลาไม่กี่วินาที"
            actionLabel={generate.isPending ? 'กำลังจัดเมนู…' : 'จัดเมนูวันนี้'}
            onAction={generate.isPending ? undefined : () => generate.mutate()}
          />
        ) : (
          <>
            {plan.data.uses_sample_data ? (
              <Banner tone="warning" message="ข้อมูลตัวอย่าง: ตัวเลขโภชนาการในแผนนี้ยังไม่ผ่านการตรวจสอบ ใช้เพื่อทดสอบระบบเท่านั้น" />
            ) : null}
            <PlanSummary plan={plan.data} />
            {plan.data.summary_th ? <AppText color={colors.muted}>{plan.data.summary_th}</AppText> : null}
            {plan.data.items.map((item) => (
              <MealCard key={item.id} item={item} onSwap={() => onSwap(item)} swapping={swappingId === item.id} />
            ))}
            <Button
              label="จัดเมนูใหม่ทั้งวัน"
              variant="secondary"
              loading={generate.isPending}
              onPress={() => generate.mutate()}
            />
            <AppText variant="caption" color={colors.muted}>
              ตัวเลขทั้งหมดเป็นค่าประมาณจากฐานข้อมูลเมนู และราคาอาจต่างกันในแต่ละร้าน ไม่ใช่คำแนะนำทางการแพทย์
            </AppText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
});
