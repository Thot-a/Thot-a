import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LABELS_TH, MEAL_TYPES, type MealType } from '@shared/constants';

import { FoodImage } from '@/components/meals/FoodImage';
import { AppText, Banner, Button, Chip, EmptyState, ErrorState, LoadingState, Stepper } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAddLog, useFoods } from '@/hooks/useFoodLogs';
import { toAppError } from '@/lib/errors';
import type { FoodItem } from '@/types/models';
import { bangkokToday } from '@/utils/date';

function defaultMeal(): MealType {
  const h = (new Date().getUTCHours() + 7) % 24;
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function AddLog() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? bangkokToday();
  const foods = useFoods();
  const add = useAddLog();
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState<MealType>(params.meal ?? defaultMeal());
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [serving, setServing] = useState(1);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = foods.data ?? [];
    return s ? all.filter((f) => f.name_th.includes(s) || f.name_en?.toLowerCase().includes(s)) : all;
  }, [foods.data, q]);

  const header = (
    <View style={styles.header}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ค้นหาเมนู เช่น กะเพรา, โจ๊ก"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="ค้นหาเมนู"
        />
      </View>
      <View style={styles.chips}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} label={LABELS_TH.meal[m]} selected={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {foods.isPending ? (
        <LoadingState />
      ) : foods.isError ? (
        <ErrorState message={toAppError(foods.error).message} onRetry={() => foods.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(f) => f.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="search-outline" title="ไม่พบเมนูนี้" message="ลองค้นด้วยคำอื่น หรือเลือกเมนูใกล้เคียง" />}
          renderItem={({ item }) => {
            const on = selected?.id === item.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.name_th}
                onPress={() => {
                  setSelected(item);
                  setServing(1);
                }}
                style={[styles.row, on && styles.rowOn]}
              >
                <FoodImage path={item.image_path} category={item.category} size={52} rounded={radius.sm} />
                <View style={styles.grow}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {item.name_th}
                  </AppText>
                  <AppText variant="caption" color={colors.muted} numberOfLines={1}>
                    ~{Math.round(item.kcal)} kcal · {item.serving_description_th}
                  </AppText>
                </View>
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.forest} /> : null}
              </Pressable>
            );
          }}
        />
      )}
      {selected ? (
        <View style={styles.footer}>
          {add.isError ? <Banner tone="error" message={toAppError(add.error).message} /> : null}
          <View style={styles.footerRow}>
            <View style={styles.grow}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {selected.name_th}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                ~{Math.round(selected.kcal * serving)} kcal
              </AppText>
            </View>
            <Stepper value={serving} onChange={setServing} min={0.5} max={3} />
          </View>
          <Button
            label={`บันทึกเป็น${LABELS_TH.meal[meal]}`}
            loading={add.isPending}
            onPress={() => add.mutate({ foodId: selected.id, date, mealType: meal, servingCount: serving }, { onSuccess: () => router.back() })}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  grow: { flex: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.charcoal },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.xs, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: colors.forest },
  footer: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
