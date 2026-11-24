import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';
import { clearCoachHistory, getCoachHistory, sendCoachMessage } from '@/services/coach';
import type { ChatMessage } from '@/types/models';

export function useCoach() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['coach', user?.id];
  const history = useQuery({ queryKey: key, queryFn: getCoachHistory, enabled: !!user });

  const send = useMutation({
    mutationFn: (message: string) => sendCoachMessage(history.data?.conversationId ?? null, message),
    onMutate: (message) => {
      // Optimistically show the user's message.
      const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'user', content: message, created_at: new Date().toISOString() };
      qc.setQueryData(key, (old: typeof history.data) => ({
        conversationId: old?.conversationId ?? null,
        messages: [...(old?.messages ?? []), optimistic],
      }));
      return { optimistic };
    },
    onSuccess: (r) =>
      qc.setQueryData(key, (old: typeof history.data) => ({
        conversationId: r.conversation_id,
        messages: [...(old?.messages ?? []), r.reply],
      })),
    onError: (_e, _m, ctx) =>
      qc.setQueryData(key, (old: typeof history.data) => ({
        conversationId: old?.conversationId ?? null,
        messages: (old?.messages ?? []).filter((m) => m.id !== ctx?.optimistic.id),
      })),
  });

  const clear = useMutation({
    mutationFn: () => clearCoachHistory(history.data?.conversationId ?? null),
    onSuccess: () => qc.setQueryData(key, { conversationId: null, messages: [] }),
  });

  return { history, send, clear };
}
