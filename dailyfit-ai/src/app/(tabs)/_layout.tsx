import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, shadow } from '@/constants/theme';
import { bangkokToday } from '@/utils/date';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName, active: IconName) =>
  function TabIcon({ color, size, focused }: { color: unknown; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : name} color={color as string} size={size - 2} />;
  };

// Custom label: the default one clips Thai vowels/tone marks below the baseline.
const label = (text: string) =>
  function TabLabel({ color }: { color: unknown }) {
    return (
      <Text style={[styles.label, { color: color as string }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {text}
      </Text>
    );
  };

function AddButton() {
  return (
    <View style={styles.addWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="บันทึกอาหาร"
        onPress={() => router.push({ pathname: '/log/add', params: { date: bangkokToday() } })}
        style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tab = (title: string, i: IconName, a: IconName) => ({ title, tabBarIcon: icon(i, a), tabBarLabel: label(title) });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: { height: 56 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen name="today" options={tab('วันนี้', 'home-outline', 'home')} />
      <Tabs.Screen name="diary" options={tab('บันทึก', 'book-outline', 'book')} />
      <Tabs.Screen name="add" options={{ title: 'บันทึกอาหาร', tabBarButton: () => <AddButton /> }} />
      <Tabs.Screen name="coach" options={tab('โค้ช AI', 'chatbubble-ellipses-outline', 'chatbubble-ellipses')} />
      <Tabs.Screen name="progress" options={tab('สรุป', 'stats-chart-outline', 'stats-chart')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, flexShrink: 0 },
  addWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  add: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    borderWidth: 4,
    borderColor: colors.white,
    ...shadow.card,
  },
});
