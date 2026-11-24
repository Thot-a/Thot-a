import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { foodImageUrl } from '@/services/foods';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Category illustration used until a licensed photo exists for the dish. */
const CATEGORY: Record<string, { icon: IconName; bg: string; fg: string }> = {
  rice_dish: { icon: 'rice', bg: '#F3E7D3', fg: '#9A6B2F' },
  noodle: { icon: 'noodles', bg: '#F6E2CF', fg: '#A35A23' },
  soup: { icon: 'pot-steam-outline', bg: '#E3ECE1', fg: '#3E6B52' },
  curry: { icon: 'bowl-mix-outline', bg: '#EFE6C9', fg: '#7A6A1F' },
  salad: { icon: 'leaf', bg: '#DFEBD9', fg: '#3F7A45' },
  side_dish: { icon: 'food-variant', bg: '#E4EADF', fg: '#4E6B43' },
  protein: { icon: 'food-drumstick-outline', bg: '#F4E1D6', fg: '#9A4E2C' },
  breakfast: { icon: 'egg-fried', bg: '#FAEBCB', fg: '#A07418' },
  snack: { icon: 'cupcake', bg: '#F5E3E3', fg: '#9A4A54' },
  drink: { icon: 'cup-outline', bg: '#E2ECF0', fg: '#3D6577' },
  fruit: { icon: 'fruit-cherries', bg: '#F3E2DC', fg: '#A3433A' },
};

export function FoodImage({
  path,
  category,
  size,
  height,
  rounded = radius.md,
  style,
}: {
  path: string | null;
  category: string;
  size?: number;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
}) {
  const url = foodImageUrl(path);
  const dims: ViewStyle = size ? { width: size, height: size } : { width: '100%', height: height ?? 160 };
  const c = CATEGORY[category] ?? { icon: 'silverware-fork-knife' as IconName, bg: colors.sageLight, fg: colors.forest };
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[dims, { borderRadius: rounded }, style as object]}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    );
  }
  const iconSize = size ? Math.round(size * 0.5) : 56;
  return (
    <View style={[dims, styles.placeholder, { borderRadius: rounded, backgroundColor: c.bg }, style]} accessible={false}>
      <MaterialCommunityIcons name={c.icon} size={iconSize} color={c.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
