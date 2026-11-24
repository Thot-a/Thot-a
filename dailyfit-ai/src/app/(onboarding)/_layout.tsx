import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.forest,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="consent" options={{ headerShown: false }} />
      <Stack.Screen name="body" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="food" />
    </Stack>
  );
}
