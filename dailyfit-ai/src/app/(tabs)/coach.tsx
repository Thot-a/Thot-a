import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LIMITS } from '@shared/constants';

import { AppText, Banner, ErrorState, LoadingState } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useCoach } from '@/hooks/useCoach';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import type { ChatMessage } from '@/types/models';

const SUGGESTIONS = [
  'วันนี้ควรกินอะไรดี?',
  'มีเมนูราคาถูกกว่านี้ไหม?',
  'ช่วยเปลี่ยนเมนูอาหารกลางวันให้หน่อย',
  'พักกลางวันแค่ 30 นาที ควรเลือกอะไร?',
  'ช่วยจัดอาหารให้เหมาะกับงบที่เหลือ',
];

export default function Coach() {
  const { history, send, clear } = useCoach();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messages = history.data?.messages ?? [];

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const submit = (msg?: string) => {
    const m = (msg ?? text).trim();
    if (!m || send.isPending) return;
    setText('');
    send.mutate(m);
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="leaf" size={20} color={colors.cream} />
        </View>
        <View style={styles.flex1}>
          <AppText variant="heading">โค้ช DailyFit</AppText>
          <AppText variant="caption" color={colors.muted}>
            ผู้ช่วยเรื่องอาหารและไลฟ์สไตล์ · ไม่ใช่คำแนะนำทางการแพทย์
          </AppText>
        </View>
        {messages.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="เริ่มบทสนทนาใหม่" hitSlop={10} onPress={() => clear.mutate()}>
            <Ionicons name="refresh" size={22} color={colors.forest} />
          </Pressable>
        ) : null}
      </View>
      {DEMO_MODE ? (
        <View style={styles.pad}>
          <Banner tone="warning" message="โหมดตัวอย่าง: คำตอบเป็นข้อความสาธิต ไม่ได้มาจาก AI จริง" />
        </View>
      ) : null}
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        {history.isPending ? (
          <LoadingState />
        ) : history.isError ? (
          <ErrorState message={toAppError(history.error).message} onRetry={() => history.refetch()} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <AppText variant="title" align="center">
                  สวัสดีครับ
                </AppText>
                <AppText color={colors.muted} align="center">
                  ถามเรื่องเมนู งบค่าอาหาร หรือการปรับแผนวันนี้ได้เลย
                </AppText>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} accessibilityRole="button" onPress={() => submit(s)} style={styles.suggestion}>
                      <AppText variant="label" color={colors.forest}>
                        {s}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.mine : styles.theirs]}>
                <AppText color={item.role === 'user' ? colors.white : colors.charcoal}>{item.content}</AppText>
              </View>
            )}
            ListFooterComponent={
              send.isPending ? (
                <View style={[styles.bubble, styles.theirs]}>
                  <AppText color={colors.muted}>กำลังพิมพ์…</AppText>
                </View>
              ) : undefined
            }
          />
        )}
        {send.isError ? (
          <View style={styles.pad}>
            <Banner tone="error" message={toAppError(send.error).message} />
          </View>
        ) : null}
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="พิมพ์คำถาม…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={LIMITS.coachMessageMaxChars}
            accessibilityLabel="พิมพ์คำถามถึงโค้ช"
            onSubmitEditing={() => submit()}
            submitBehavior="submit"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ส่งข้อความ"
            onPress={() => submit()}
            disabled={!text.trim() || send.isPending}
            style={[styles.send, (!text.trim() || send.isPending) && { opacity: 0.4 }]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1 },
  pad: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.xs, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  suggestions: { gap: spacing.xs, marginTop: spacing.sm },
  suggestion: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1.5, borderColor: colors.sageLight },
  bubble: { maxWidth: '85%', padding: spacing.sm, borderRadius: radius.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.forest, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.charcoal, maxHeight: 120, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.cream, borderRadius: radius.md },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
