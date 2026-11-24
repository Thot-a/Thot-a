import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';

import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { firstErrors, SignInForm } from '@/domain/forms';
import { toAppError } from '@/lib/errors';
import { signIn } from '@/services/auth';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: (v: { email: string; password: string }) => signIn(v.email, v.password) });

  const submit = () => {
    const parsed = SignInForm.safeParse({ email, password });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});
    m.mutate(parsed.data); // on success, the root navigator switches stacks automatically
  };

  return (
    <Screen edges={['bottom']} footer={<Button label="เข้าสู่ระบบ" loading={m.isPending} onPress={submit} />}>
      <AppText variant="title">ยินดีต้อนรับกลับมา</AppText>
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      <TextField
        label="อีเมล"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="รหัสผ่าน"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Link href="/forgot-password" style={{ alignSelf: 'flex-end' }}>
        <AppText variant="label" color={colors.forest}>
          ลืมรหัสผ่าน?
        </AppText>
      </Link>
    </Screen>
  );
}
