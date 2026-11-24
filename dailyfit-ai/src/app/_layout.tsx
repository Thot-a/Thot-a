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

import { AppText, Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useConsents, useProfile } from '@/hooks/useProfile';
import { envResult } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
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
          {envResult.ok ? <RootNavigator /> : <NotConfigured problems={envResult.problems} />}
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, initializing } = useAuth();
  const signedIn = !!session;
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

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
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
