/** DailyFit AI design tokens. Use these instead of hard-coded values. */
export const colors = {
  forest: '#244436',
  sage: '#A9BEA6',
  cream: '#F5F4EC',
  white: '#FFFFFF',
  charcoal: '#252B27',
  accent: '#E8A45B',
  // Derived tones
  forestSoft: '#E4ECE3',
  sageLight: '#DCE6DA',
  muted: '#6B746E',
  border: '#E3E2D8',
  danger: '#B4483C',
  dangerSoft: '#F7E3DF',
  success: '#2F6B4F',
  successSoft: '#E1EFE6',
  accentSoft: '#FBEBD7',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const fonts = {
  regular: 'NotoSansThai_400Regular',
  medium: 'NotoSansThai_500Medium',
  semibold: 'NotoSansThai_600SemiBold',
  bold: 'NotoSansThai_700Bold',
} as const;

/** Thai glyphs need generous line height so stacked vowels/tone marks are not clipped. */
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 42 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 34 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadow = {
  card: {
    shadowColor: '#1B2A22',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const MIN_TOUCH = 48;
