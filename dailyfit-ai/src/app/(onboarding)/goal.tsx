import { router } from 'expo-router';
import { useState } from 'react';

import { ACTIVITY_LEVELS, type ActivityLevel, type Goal, GOALS, LABELS_TH } from '@shared/constants';

import { AppText, Banner, Button, OptionCard, Screen, StepHeader } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toAppError } from '@/lib/errors';

const GOAL_DESC: Record<Goal, string> = {
  healthy_lifestyle: 'กินให้ดีขึ้นแบบสบาย ๆ ทำได้ทุกวัน',
  weight_management: 'จัดพลังงานให้พอดี แบบค่อยเป็นค่อยไป',
  muscle_support: 'เน้นโปรตีนให้เพียงพอ เหมาะกับคนออกกำลังกาย',
  balanced_nutrition: 'กระจายสารอาหารให้ครบในแต่ละวัน',
};

export default function GoalStep() {
  const { data: profile } = useProfile();
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'healthy_lifestyle');
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activityLevel ?? 'light');
  const m = useUpdateProfile();

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label="ถัดไป"
          loading={m.isPending}
          onPress={() => m.mutate({ profile: { goal, activityLevel: activity } }, { onSuccess: () => router.push('/food') })}
        />
      }
    >
      <StepHeader step={3} total={4} title="เป้าหมายของคุณคืออะไร" />
      {m.isError ? <Banner tone="error" message={toAppError(m.error).message} /> : null}
      {GOALS.map((g) => (
        <OptionCard key={g} title={LABELS_TH.goal[g]} description={GOAL_DESC[g]} selected={goal === g} onPress={() => setGoal(g)} />
      ))}
      <AppText variant="heading">ปกติคุณขยับร่างกายแค่ไหน</AppText>
      {ACTIVITY_LEVELS.map((a) => (
        <OptionCard key={a} title={LABELS_TH.activity[a]} selected={activity === a} onPress={() => setActivity(a)} />
      ))}
    </Screen>
  );
}
