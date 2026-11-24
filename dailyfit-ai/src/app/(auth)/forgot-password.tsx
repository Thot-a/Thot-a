import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { firstErrors, ForgotPasswordForm } from '@/domain/forms';
import { toAppError } from '@/lib/errors';
import { requestPasswordReset } from '@/services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: (e: string) => requestPasswordReset(e) });

  const submit = () => {
    const parsed = ForgotPasswordForm.safeParse({ email });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});
    m.mutate(parsed.data.email);
  };

  return (
    <Screen edges={['bottom']} footer={<Button label="ส่งลิงก์รีเซ็ตรหัสผ่าน" loading={m.isPending} disabled={m.isSuccess} onPress={submit} />}>
      <AppText variant="title">รีเซ็ตรหัสผ่าน</AppText>
      <AppText color={colors.muted}>กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้</AppText>
      {m.isSuccess ? <Banner tone="success" message="หากอีเมลนี้มีบัญชีอยู่ คุณจะได้รับลิงก์ภายในไม่กี่นาที" /> : null}
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField
        label="อีเมล"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onSubmitEditing={submit}
      />
    </Screen>
  );
}
