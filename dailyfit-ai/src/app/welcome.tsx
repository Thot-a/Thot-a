import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'restaurant-outline', title: 'จัดเมนูให้ทุกวัน', body: 'เลือกอาหารไทยที่หาซื้อได้จริง ตามเป้าหมายและงบของคุณ' },
  { icon: 'wallet-outline', title: 'คุมงบได้', body: 'เห็นราคาประมาณของแต่ละมื้อ ไม่ต้องคิดเองให้เหนื่อย' },
  { icon: 'chatbubble-ellipses-outline', title: 'ถามโค้ช AI ได้', body: 'ปรึกษาเรื่องอาหารและไลฟ์สไตล์เป็นภาษาไทย' },
];

export default function Welcome() {
  return (
    <Screen
      footer={
        <>
          <Button label="เริ่มต้นใช้งาน" onPress={() => router.push('/sign-up')} />
          <Button label="ฉันมีบัญชีแล้ว · เข้าสู่ระบบ" variant="ghost" onPress={() => router.push('/sign-in')} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.logo} accessibilityRole="image" accessibilityLabel="โลโก้ DailyFit AI">
          <Ionicons name="leaf" size={36} color={colors.cream} />
        </View>
        <AppText variant="display" align="center">
          DailyFit AI
        </AppText>
        <AppText align="center" color={colors.muted}>
          ผู้ช่วยจัดมื้ออาหารสำหรับคนทำงาน{'\n'}กินดีขึ้น โดยไม่ต้องวางแผนเอง
        </AppText>
      </View>
      <View style={styles.list}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.icon}>
              <Ionicons name={f.icon} size={22} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{f.title}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {f.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <AppText variant="caption" align="center" color={colors.muted}>
        DailyFit AI ให้ข้อมูลทั่วไปเพื่อการใช้ชีวิต ไม่ใช่คำแนะนำทางการแพทย์
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.md, marginTop: spacing.md },
  feature: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.sageLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
