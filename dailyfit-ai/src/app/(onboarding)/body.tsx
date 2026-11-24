import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SEXES, LABELS_TH, type Sex } from '@shared/constants';

import { AppText, Banner, Button, Chip, Screen, StepHeader, TextField } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { BodyForm, firstErrors, normalizeBirthYearInput } from '@/domain/forms';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

export default function Body() {
  const { data: profile } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [birthYear, setBirthYear] = useState(str(profile?.birthYear));
  const [heightCm, setHeightCm] = useState(str(profile?.heightCm));
  const [weightKg, setWeightKg] = useState(str(profile?.weightKg));
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useUpdateProfile();

  const submit = () => {
    const parsed = BodyForm.safeParse({ displayName, birthYear: normalizeBirthYearInput(birthYear), heightCm, weightKg, sex });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});
    m.mutate({ profile: parsed.data }, { onSuccess: () => router.push('/goal') });
  };

  return (
    <Screen edges={['bottom']} footer={<Button label="ถัดไป" loading={m.isPending} onPress={submit} />}>
      <StepHeader step={2} total={4} title="เล่าเรื่องตัวคุณสักนิด" subtitle="ข้อมูลร่างกายไม่บังคับ แต่ช่วยให้ประมาณพลังงานต่อวันได้ใกล้เคียงขึ้น" />
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField label="ชื่อที่ให้เราเรียก" value={displayName} onChangeText={setDisplayName} error={errors.displayName} maxLength={50} />
      <TextField
        label="ปีเกิด (ไม่บังคับ)"
        value={birthYear}
        onChangeText={setBirthYear}
        error={errors.birthYear}
        hint="พิมพ์ได้ทั้ง พ.ศ. หรือ ค.ศ. เช่น 2537 หรือ 1994"
        keyboardType="number-pad"
        maxLength={4}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="ส่วนสูง" value={heightCm} onChangeText={setHeightCm} error={errors.heightCm} keyboardType="decimal-pad" suffix="ซม." maxLength={5} />
        </View>
        <View style={styles.flex}>
          <TextField label="น้ำหนัก" value={weightKg} onChangeText={setWeightKg} error={errors.weightKg} keyboardType="decimal-pad" suffix="กก." maxLength={5} />
        </View>
      </View>
      <AppText variant="label">เพศ (ไม่บังคับ · ใช้คำนวณพลังงานเท่านั้น)</AppText>
      <View style={styles.chips}>
        {SEXES.map((s) => (
          <Chip key={s} label={LABELS_TH.sex[s]} selected={sex === s} onPress={() => setSex(sex === s ? null : s)} />
        ))}
      </View>
      <AppText variant="caption" color={colors.muted}>
        เราไม่ใช้ข้อมูลนี้เพื่อวินิจฉัยโรค และจะไม่แสดงตัวเลขที่ทำให้รู้สึกกดดันเรื่องรูปร่าง
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
