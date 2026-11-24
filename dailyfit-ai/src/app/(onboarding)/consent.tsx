import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Banner, Button, Card, Screen, StepHeader } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useRecordConsents } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import { signOut } from '@/services/auth';
import type { ConsentType } from '@/services/consents';

interface Item {
  type: ConsentType;
  title: string;
  body: string;
  required: boolean;
}

const ITEMS: Item[] = [
  {
    type: 'privacy_policy',
    title: 'นโยบายความเป็นส่วนตัว',
    body: 'เราเก็บเฉพาะข้อมูลที่จำเป็นต่อการแนะนำอาหาร คุณขอลบบัญชีและข้อมูลทั้งหมดได้ทุกเมื่อในหน้าโปรไฟล์',
    required: true,
  },
  { type: 'terms', title: 'ข้อตกลงการใช้งาน', body: 'คำแนะนำเป็นข้อมูลทั่วไป ไม่ใช่การวินิจฉัยหรือรักษาโรค และไม่ทดแทนแพทย์หรือนักกำหนดอาหาร', required: true },
  {
    type: 'health_data',
    title: 'ข้อมูลสุขภาพและการกิน',
    body: 'ยินยอมให้ประมวลผลข้อมูลร่างกาย (ถ้ากรอก) และบันทึกการกิน เพื่อจัดแผนอาหารให้คุณ ข้อมูลนี้ถือเป็นข้อมูลอ่อนไหว เราไม่ขายหรือแชร์เพื่อการโฆษณา',
    required: true,
  },
  {
    type: 'ai_personalization',
    title: 'ให้ AI ใช้ข้อมูลโปรไฟล์ (ไม่บังคับ)',
    body: 'ส่งข้อมูลสรุป เช่น เป้าหมาย งบ และข้อจำกัดอาหาร ให้ผู้ให้บริการ AI เพื่อคำแนะนำที่ตรงตัวขึ้น โดยไม่ส่งชื่อหรืออีเมล',
    required: false,
  },
  { type: 'analytics', title: 'ช่วยปรับปรุงแอป (ไม่บังคับ)', body: 'เก็บสถิติการใช้งานแบบไม่มีข้อมูลสุขภาพ เพื่อพัฒนาแอป', required: false },
];

export default function Consent() {
  const [checked, setChecked] = useState<Partial<Record<ConsentType, boolean>>>({});
  const m = useRecordConsents();
  const requiredOk = ITEMS.filter((i) => i.required).every((i) => checked[i.type]);

  const submit = () => {
    const decisions = Object.fromEntries(ITEMS.map((i) => [i.type, !!checked[i.type]]));
    m.mutate(decisions, { onSuccess: () => router.push('/body') });
  };

  return (
    <Screen
      footer={
        <>
          <Button label="ยอมรับและไปต่อ" disabled={!requiredOk} loading={m.isPending} onPress={submit} />
          <Button label="ออกจากระบบ" variant="ghost" onPress={() => signOut().catch(() => {})} />
        </>
      }
    >
      <StepHeader step={1} total={4} title="ก่อนเริ่ม ขอความยินยอมนิดนึง" subtitle="คุณเปลี่ยนการตั้งค่าเหล่านี้ได้ภายหลัง" />
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      {ITEMS.map((item) => {
        const on = !!checked[item.type];
        return (
          <Pressable
            key={item.type}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={item.title}
            onPress={() => setChecked((c) => ({ ...c, [item.type]: !on }))}
          >
            <Card style={[styles.row, on && styles.on]}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.forest : colors.sage} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {item.title}
                  {item.required ? <AppText color={colors.danger}> *</AppText> : null}
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  {item.body}
                </AppText>
              </View>
            </Card>
          </Pressable>
        );
      })}
      <AppText variant="caption" color={colors.muted}>
        * จำเป็นต่อการใช้งาน
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  on: { borderWidth: 1.5, borderColor: colors.forest },
  flex: { flex: 1, gap: 2 },
});
