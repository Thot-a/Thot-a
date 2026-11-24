import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getConsents, recordConsents, type ConsentType } from '@/services/consents';
import { getMyProfile, updatePreferences, updateProfile, type PreferencesUpdate, type ProfileUpdate } from '@/services/profile';
import { useAuth } from '@/providers/AuthProvider';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;
export const consentsKey = (userId: string | undefined) => ['consents', userId] as const;

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({ queryKey: profileKey(userId), queryFn: getMyProfile, enabled: !!userId });
}

export function useConsents() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({ queryKey: consentsKey(userId), queryFn: getConsents, enabled: !!userId });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (v: { profile?: ProfileUpdate; preferences?: PreferencesUpdate }) => {
      if (v.preferences) await updatePreferences(v.preferences);
      if (v.profile) await updateProfile(v.profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(session?.user.id) }),
  });
}

export function useRecordConsents() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (d: Partial<Record<ConsentType, boolean>>) => recordConsents(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: consentsKey(session?.user.id) }),
  });
}
