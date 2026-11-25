import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { LABELS_TH } from '@shared/constants';

import { AppText, Banner, Button, Card, ErrorState, LoadingState, Screen, Sheet } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useConsents, useProfile, useRecordConsents, useUpdateProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { deleteAccount, signOut } from '@/services/auth';

export default function ProfileScreen() {
  const { user } = useAuth();
  const profile = useProfile();
  const consents = useConsents();
  const recordConsent = useRecordConsents();
  const updateProfile = useUpdateProfile();
  const signOutM = useMutation({ mutationFn: signOut });
  const deleteM = useMutation({ mutationFn: deleteAccount });
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState message={toAppError(profile.error).message} onRetry={() => profile.refetch()} />;
  const p = profile.data;
  const err = signOutM.error ?? deleteM.error ?? recordConsent.error ?? updateProfile.error;

  return (
    <Screen edges={['bottom']}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <AppText variant="title" color={colors.white}>
            {(p.displayName ?? '?').slice(0, 1)}
          </AppText>
        </View>
        <View style={styles.flex1}>
          <AppText variant="title">{p.displayName ?? 'ผู้ใช้'}</AppText>
          <AppText variant="caption" color={colors.muted}>
            {user?.email ?? ''}
          </AppText>
        </View>
      </View>

      {err ? <Banner tone="error" message={toAppError(err).message} /> : null}

      <Section title="ข้อมูลของฉัน" action="แก้ไข" onAction={() => router.push('/settings/edit')}>
        <Row label="เป้าหมาย" value={LABELS_TH.goal[p.goal]} />
        <Row label="ระดับกิจกรรม" value={LABELS_TH.activity[p.activityLevel]} />
        <Row label="งบต่อวัน" value={`฿${p.dailyBudgetThb}`} />
        <Row label="จำนวนมื้อ" value={p.mealsPerDay === 4 ? '3 มื้อ + ของว่าง' : `${p.mealsPerDay} มื้อ`} />
        <Row label="ข้อจำกัดอาหาร" value={p.restrictions.length ? p.restrictions.map((r) => LABELS_TH.restriction[r]).join(', ') : 'ไม่มี'} />
        <Row label="ไม่อยากกิน" value={p.excludedTags.length ? p.excludedTags.map((t) => LABELS_TH.tag[t]).join(', ') : 'ไม่มี'} />
      </Section>

      <Section title="สมาชิก">
        <View style={styles.plan}>
          <View style={styles.flex1}>
            <AppText variant="bodyStrong">แพ็กเกจฟรี</AppText>
            <AppText variant="caption" color={colors.muted}>
              จัดแผน 2 ครั้ง/วัน · เปลี่ยนเมนู 3 ครั้ง/วัน · ถามโค้ช 5 ข้อความ/วัน
            </AppText>
          </View>
        </View>
        <View style={styles.premium}>
          <AppText variant="bodyStrong" color={colors.forest}>
            Premium ฿149/เดือน
          </AppText>
          <AppText variant="caption" color={colors.charcoal}>
            แผนรายสัปดาห์ · เปลี่ยนเมนูได้มากขึ้น · โค้ช AI เพิ่มเติม · สรุปพฤติกรรมรายสัปดาห์
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            เปิดให้สมัครเร็ว ๆ นี้
          </AppText>
        </View>
      </Section>

      <Section title="การแจ้งเตือน">
        <ToggleRow
          label="เตือนให้บันทึกมื้ออาหาร"
          hint="บันทึกการตั้งค่าไว้แล้ว การแจ้งเตือนจริงจะเริ่มทำงานในแอปเวอร์ชันติดตั้ง"
          value={p.mealReminders}
          onChange={(v) => updateProfile.mutate({ preferences: { mealReminders: v } })}
        />
      </Section>

      <Section title="ความเป็นส่วนตัว">
        <ToggleRow
          label="ให้ AI ใช้ข้อมูลโปรไฟล์"
          hint="ส่งเฉพาะเป้าหมาย งบ และข้อจำกัดอาหาร ไม่ส่งชื่อหรืออีเมล"
          value={!!consents.data?.ai_personalization?.granted}
          onChange={(v) => recordConsent.mutate({ ai_personalization: v })}
        />
        <ToggleRow
          label="ช่วยปรับปรุงแอป (สถิติการใช้งาน)"
          hint="ไม่มีข้อมูลสุขภาพ"
          value={!!consents.data?.analytics?.granted}
          onChange={(v) => recordConsent.mutate({ analytics: v })}
        />
        <Row label="ภาษา" value="ไทย (English เร็ว ๆ นี้)" />
      </Section>

      <Button label="ออกจากระบบ" variant="secondary" loading={signOutM.isPending} onPress={() => signOutM.mutate()} />
      <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.deleteLink}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <AppText variant="label" color={colors.danger}>
          ลบบัญชีและข้อมูลทั้งหมด
        </AppText>
      </Pressable>
      <AppText variant="caption" color={colors.muted} align="center">
        DailyFit AI ให้ข้อมูลทั่วไป ไม่ใช่การวินิจฉัยหรือรักษาโรค
      </AppText>

      <Sheet
        visible={confirmDelete}
        title="ลบบัญชีถาวร?"
        message="ข้อมูลโปรไฟล์ แผนอาหาร บันทึกการกิน และประวัติการคุยกับโค้ชจะถูกลบทั้งหมดและกู้คืนไม่ได้"
        onClose={() => setConfirmDelete(false)}
        options={[{ label: 'ลบบัญชีถาวร', destructive: true, onPress: () => deleteM.mutate() }]}
      />
    </Screen>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="label" color={colors.muted}>
          {title}
        </AppText>
        {action && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
            <AppText variant="label" color={colors.forest}>
              {action}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText color={colors.muted}>{label}</AppText>
      <AppText variant="bodyStrong" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex1}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.muted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.forest, false: colors.sageLight }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.xs },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  value: { flexShrink: 1, textAlign: 'right' },
  plan: { flexDirection: 'row' },
  premium: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  deleteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 44 },
});
