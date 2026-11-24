import { Stack } from 'expo-router';

import { colors, fonts } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.forest,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: 'เข้าสู่ระบบ' }} />
      <Stack.Screen name="sign-up" options={{ title: 'สมัครสมาชิก' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'ลืมรหัสผ่าน' }} />
    </Stack>
  );
}
