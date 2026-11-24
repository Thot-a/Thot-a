import {
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-sans-thai';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoBadge } from '@/components/DemoBadge';
import { AppText, Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useConsents, useProfile } from '@/hooks/useProfile';
import { DEMO_MODE } from '@/lib/demo';
import { envResult } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { EntryContext } from '@/providers/EntryContext';
import { signOut } from '@/services/auth';
import { hasRequiredConsents } from '@/services/consents';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
  });

  if (!fontsLoaded && !fontError) return null; // splash stays visible

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          {DEMO_MODE || envResult.ok ? <RootNavigator /> : <NotConfigured problems={envResult.problems} />}
          <DemoBadge />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const signedIn = !!user;
  const profile = useProfile();
  const consents = useConsents();

  const loadingUser = signedIn && (profile.isPending || consents.isPending);
  const ready = !initializing && !loadingUser;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <LoadingState />;

  if (signedIn && (profile.isError || consents.isError)) {
    const err = toAppError(profile.error ?? consents.error);
    return (
      <Screen scroll={false}>
        <ErrorState
          message={err.message}
          onRetry={() => {
            profile.refetch();
            consents.refetch();
          }}
        />
        <Button label="ออกจากระบบ" variant="ghost" onPress={() => signOut().catch(() => {})} />
      </Screen>
    );
  }

  const onboarded = signedIn && !!profile.data?.onboardingCompletedAt && !!consents.data && hasRequiredConsents(consents.data);

  const entry = !signedIn ? '/welcome' : onboarded ? '/today' : '/consent';

  return (
    <EntryContext.Provider value={entry}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="meal/planner" options={modalHeader('จัดแผนอาหาร')} />
        <Stack.Screen name="food/[id]" options={modalHeader('รายละเอียดเมนู')} />
        <Stack.Screen name="log/add" options={{ ...modalHeader('บันทึกอาหาร'), presentation: 'modal' }} />
        <Stack.Screen name="settings/edit" options={modalHeader('แก้ไขข้อมูล')} />
      </Stack.Protected>
    </Stack>
    </EntryContext.Provider>
  );
}

function modalHeader(title: string) {
  return {
    headerShown: true,
    title,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.cream },
    headerTintColor: colors.forest,
    headerTitleStyle: { fontFamily: fonts.semibold },
    headerBackButtonDisplayMode: 'minimal' as const,
  };
}

function NotConfigured({ problems }: { problems: string[] }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <Screen>
      <AppText variant="title">ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์</AppText>
      <AppText color={colors.muted}>
        สร้างไฟล์ .env จาก .env.example แล้วใส่ EXPO_PUBLIC_SUPABASE_URL และ EXPO_PUBLIC_SUPABASE_ANON_KEY จากนั้นเริ่ม Expo ใหม่
      </AppText>
      {__DEV__ ? problems.map((p) => <AppText key={p} variant="caption" color={colors.danger}>{p}</AppText>) : null}
    </Screen>
  );
}
