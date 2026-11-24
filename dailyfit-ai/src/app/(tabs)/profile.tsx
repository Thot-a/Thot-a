import { useMutation } from '@tanstack/react-query';
import { Alert, StyleSheet, View } from 'react-native';

import { LABELS_TH } from '@shared/constants';

import { AppText, Banner, Button, Card, ErrorState, LoadingState, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { deleteAccount, signOut } from '@/services/auth';

export default function ProfileScreen() {
  const { session } = useAuth();
  const profile = useProfile();
  const signOutM = useMutation({ mutationFn: signOut });
  const deleteM = useMutation({ mutationFn: deleteAccount });

  const confirmDelete = () =>
    Alert.alert(
      'ลบบัญชีถาวร?',
      'ข้อมูลโปรไฟล์ แผนอาหาร บันทึกการกิน และประวัติการคุยกับ AI จะถูกลบทั้งหมดและกู้คืนไม่ได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบบัญชี', style: 'destructive', onPress: () => deleteM.mutate() },
      ],
    );

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState message={toAppError(profile.error).message} onRetry={() => profile.refetch()} />;
  const p = profile.data;

  return (
    <Screen edges={['top']}>
      <AppText variant="title">โปรไฟล์</AppText>
      <Card style={styles.card}>
        <Row label="ชื่อ" value={p.displayName ?? '-'} />
        <Row label="อีเมล" value={session?.user.email ?? '-'} />
        <Row label="เป้าหมาย" value={LABELS_TH.goal[p.goal]} />
        <Row label="งบต่อวัน" value={`฿${p.dailyBudgetThb}`} />
        <Row label="จำนวนมื้อ" value={`${p.mealsPerDay} มื้อ`} />
        <Row
          label="ข้อจำกัดอาหาร"
          value={p.restrictions.length ? p.restrictions.map((r) => LABELS_TH.restriction[r]).join(', ') : 'ไม่มี'}
        />
      </Card>
      {signOutM.isError || deleteM.isError ? (
        <Banner tone="error" message={toAppError(signOutM.error ?? deleteM.error).message} />
      ) : null}
      <Button label="ออกจากระบบ" variant="secondary" loading={signOutM.isPending} onPress={() => signOutM.mutate()} />
      <View style={styles.danger}>
        <AppText variant="label">ลบบัญชีและข้อมูลทั้งหมด</AppText>
        <AppText variant="caption" color={colors.muted}>
          เราจะลบข้อมูลส่วนบุคคลของคุณออกจากระบบทันที
        </AppText>
        <Button label="ลบบัญชี" variant="danger" loading={deleteM.isPending} onPress={confirmDelete} />
      </View>
    </Screen>
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

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  value: { flexShrink: 1, textAlign: 'right' },
  danger: { marginTop: spacing.lg, gap: spacing.xs },
});
