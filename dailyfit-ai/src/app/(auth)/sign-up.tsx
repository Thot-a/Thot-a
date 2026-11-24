import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { firstErrors, SignUpForm } from '@/domain/forms';
import { toAppError } from '@/lib/errors';
import { signUp } from '@/services/auth';

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: (v: { displayName: string; email: string; password: string }) => signUp(v.email, v.password, v.displayName),
  });

  const submit = () => {
    const parsed = SignUpForm.safeParse({ displayName, email, password });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});
    m.mutate(parsed.data);
  };

  if (m.isSuccess && m.data.needsConfirmation) {
    return (
      <Screen edges={['bottom']} footer={<Button label="ไปหน้าเข้าสู่ระบบ" onPress={() => router.replace('/sign-in')} />}>
        <AppText variant="title">ตรวจสอบอีเมลของคุณ</AppText>
        <AppText color={colors.muted}>
          เราส่งลิงก์ยืนยันไปที่ {email.trim().toLowerCase()} แล้ว กดลิงก์ในอีเมลก่อน จากนั้นกลับมาเข้าสู่ระบบได้เลย
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} footer={<Button label="สร้างบัญชี" loading={m.isPending} onPress={submit} />}>
      <AppText variant="title">เริ่มต้นกับ DailyFit AI</AppText>
      <AppText color={colors.muted}>ใช้เวลาไม่ถึง 2 นาที</AppText>
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField label="ชื่อที่ให้เราเรียก" value={displayName} onChangeText={setDisplayName} error={errors.displayName} autoComplete="given-name" maxLength={50} />
      <TextField
        label="อีเมล"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="รหัสผ่าน"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint="อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
    </Screen>
  );
}
