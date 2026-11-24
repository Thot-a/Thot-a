import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LABELS_TH, MEAL_TYPES, type MealType } from '@shared/constants';

import { FoodImage } from '@/components/meals/FoodImage';
import { AppText, Banner, Button, Card, Chip, ErrorState, LoadingState, Screen, Stepper } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAddLog, useFood } from '@/hooks/useFoodLogs';
import { toAppError } from '@/lib/errors';
import { bangkokToday } from '@/utils/date';

export default function FoodDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const food = useFood(id);
  const add = useAddLog();
  const [meal, setMeal] = useState<MealType>('lunch');
  const [serving, setServing] = useState(1);

  if (food.isPending) return <LoadingState />;
  if (food.isError) return <ErrorState message={toAppError(food.error).message} onRetry={() => food.refetch()} />;
  if (!food.data) return <ErrorState message="ไม่พบเมนูนี้" />;
  const f = food.data;

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={add.isSuccess ? 'บันทึกแล้ว ✓' : `บันทึกว่ากิน (${LABELS_TH.meal[meal]})`}
          loading={add.isPending}
          disabled={add.isSuccess}
          onPress={() => add.mutate({ foodId: f.id, date: bangkokToday(), mealType: meal, servingCount: serving }, { onSuccess: () => setTimeout(() => router.back(), 600) })}
        />
      }
    >
      <FoodImage path={f.image_path} category={f.category} height={200} />
      {!f.image_path ? (
        <AppText variant="caption" color={colors.muted} align="center">
          ภาพประกอบตามหมวดอาหาร · รูปจริงจะเพิ่มภายหลัง
        </AppText>
      ) : null}
      <View>
        <AppText variant="title">{f.name_th}</AppText>
        {f.name_en ? <AppText color={colors.muted}>{f.name_en}</AppText> : null}
        <AppText variant="caption" color={colors.muted}>
          ต่อ {f.serving_description_th}
        </AppText>
      </View>
      {f.verification_status === 'sample' ? (
        <Banner tone="warning" message="ข้อมูลตัวอย่าง: ตัวเลขด้านล่างยังไม่ผ่านการตรวจสอบจากแหล่งอ้างอิง" />
      ) : (
        <Banner tone="info" message="ข้อมูลโภชนาการจากฐานข้อมูลที่มีแหล่งอ้างอิง เป็นค่าประมาณต่อหน่วยบริโภค" />
      )}
      <Card style={styles.grid}>
        <Nutrient label="พลังงาน" value={`~${Math.round(f.kcal)}`} unit="kcal" />
        <Nutrient label="โปรตีน" value={`~${f.protein_g}`} unit="g" />
        <Nutrient label="คาร์โบไฮเดรต" value={`~${f.carbs_g}`} unit="g" />
        <Nutrient label="ไขมัน" value={`~${f.fat_g}`} unit="g" />
      </Card>
      <Card>
        <AppText variant="caption" color={colors.muted}>
          ราคาประมาณ (อาจต่างกันในแต่ละร้าน)
        </AppText>
        <AppText variant="heading">
          ฿{f.price_min_thb}–{f.price_max_thb}
        </AppText>
      </Card>
      <View style={styles.chips}>
        {f.tags.map((t) => (
          <View key={t} style={styles.tag}>
            <AppText variant="caption" color={colors.forest}>
              {LABELS_TH.tag[t as keyof typeof LABELS_TH.tag] ?? t}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="label">บันทึกเป็นมื้อ</AppText>
      <View style={styles.chips}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} label={LABELS_TH.meal[m]} selected={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>
      <View style={styles.row}>
        <AppText variant="label">จำนวนที่</AppText>
        <Stepper value={serving} onChange={setServing} min={0.5} max={3} />
      </View>
      {add.isError ? <Banner tone="error" message={toAppError(add.error).message} /> : null}
    </Screen>
  );
}

function Nutrient({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.nutrient}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <AppText variant="heading">
        {value}
        <AppText variant="caption" color={colors.muted}>{` ${unit}`}</AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  nutrient: { width: '50%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: colors.forestSoft, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
