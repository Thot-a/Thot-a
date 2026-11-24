import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={color as string} size={size - 2} />;
  };

// Custom label: the default one clips Thai vowels/tone marks below the baseline.
const label = (text: string) =>
  function TabLabel({ color }: { color: unknown }) {
    return (
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, flexShrink: 0, color: color as string }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {text}
      </Text>
    );
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tab = (title: string, iconName: IconName) => ({ title, tabBarIcon: icon(iconName), tabBarLabel: label(title) });
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
      <Tabs.Screen name="today" options={tab('วันนี้', 'today-outline')} />
      <Tabs.Screen name="diary" options={tab('บันทึก', 'book-outline')} />
      <Tabs.Screen name="coach" options={tab('โค้ช AI', 'chatbubble-ellipses-outline')} />
      <Tabs.Screen name="progress" options={tab('สรุป', 'stats-chart-outline')} />
      <Tabs.Screen name="profile" options={tab('โปรไฟล์', 'person-circle-outline')} />
    </Tabs>
  );
}
