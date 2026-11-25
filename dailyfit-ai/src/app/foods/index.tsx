import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodImage } from '@/components/meals/FoodImage';
import { AppText, Chip, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useFoods } from '@/hooks/useFoodLogs';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';

const FILTERS: { key: string; label: string; categories?: string[] }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'rice', label: 'ข้าว', categories: ['rice_dish'] },
  { key: 'noodle', label: 'เส้น', categories: ['noodle'] },
  { key: 'soup', label: 'เมนูน้ำ/แกง', categories: ['soup', 'curry'] },
  { key: 'light', label: 'สลัด/โปรตีน', categories: ['salad', 'protein'] },
  { key: 'breakfast', label: 'มื้อเช้า', categories: ['breakfast'] },
  { key: 'other', label: 'ของว่าง/เครื่องดื่ม', categories: ['snack', 'drink', 'fruit', 'side_dish'] },
];

export default function FoodLibrary() {
  const foods = useFoods();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    const cats = FILTERS.find((f) => f.key === filter)?.categories;
    const s = q.trim().toLowerCase();
    return (foods.data ?? []).filter(
      (f) => (!cats || cats.includes(f.category)) && (!s || f.name_th.includes(s) || f.name_en?.toLowerCase().includes(s)),
    );
  }, [foods.data, q, filter]);

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
          numColumns={2}
          columnWrapperStyle={styles.cols}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.search}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput value={q} onChangeText={setQ} placeholder="ค้นหาเมนู" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="ค้นหาเมนู" />
              </View>
              <View style={styles.chips}>
                {FILTERS.map((f) => (
                  <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
                ))}
              </View>
              <AppText variant="caption" color={colors.muted}>
                {list.length} เมนู{DEMO_MODE ? ' · ข้อมูลตัวอย่าง' : ''} · ภาพประกอบตามหมวด รูปจริงจะเพิ่มภายหลัง
              </AppText>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="search-outline" title="ไม่พบเมนู" message="ลองค้นด้วยคำอื่น หรือเลือกหมวดอื่น" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name_th}
              onPress={() => router.push({ pathname: '/food/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <FoodImage path={item.image_path} category={item.category} height={110} rounded={radius.md} />
              <AppText variant="label" numberOfLines={2} style={styles.name}>
                {item.name_th}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                ~{Math.round(item.kcal)} kcal · ฿{item.price_min_thb}–{item.price_max_thb}
              </AppText>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  cols: { gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.charcoal },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xs, gap: 2, ...shadow.card },
  name: { minHeight: 44, marginTop: 4 },
});
