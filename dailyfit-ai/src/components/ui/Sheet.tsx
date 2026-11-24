import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface SheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Bottom sheet with options. Works on iOS, Android and web (RN Alert buttons don't work on web). */
export function Sheet({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="ปิด" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <AppText variant="heading" align="center">
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" color={colors.muted} align="center">
            {message}
          </AppText>
        ) : null}
        {options.map((o) => (
          <Button
            key={o.label}
            label={o.label}
            variant={o.destructive ? 'danger' : 'secondary'}
            onPress={() => {
              onClose();
              o.onPress();
            }}
          />
        ))}
        <Button label="ยกเลิก" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,30,25,0.35)' },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.sage, marginBottom: spacing.xs },
});
