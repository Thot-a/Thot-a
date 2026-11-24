import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/constants/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color = colors.charcoal, align, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], { color, textAlign: align }, style]} maxFontSizeMultiplier={1.6} />;
}
