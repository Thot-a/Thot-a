import type { CoachResponse } from '@shared/contracts';

import { demoCoach } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types/models';

import { invokeFunction } from './functions';

/** Messages of the most recent conversation (oldest first). */
export async function getCoachHistory(): Promise<{ conversationId: string | null; messages: ChatMessage[] }> {
  if (DEMO_MODE) return { conversationId: 'demo', messages: await demoCoach.history() };
  const sb = requireSupabase();
  const conv = await sb.from('ai_conversations').select('id').order('last_message_at', { ascending: false }).limit(1).maybeSingle();
  if (conv.error) throw toAppError(conv.error);
  if (!conv.data) return { conversationId: null, messages: [] };
  const msgs = await sb
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conv.data.id)
    .order('created_at')
    .limit(100);
  if (msgs.error) throw toAppError(msgs.error);
  return { conversationId: conv.data.id as string, messages: msgs.data as ChatMessage[] };
}

export async function sendCoachMessage(conversationId: string | null, message: string): Promise<CoachResponse> {
  if (DEMO_MODE) {
    try {
      const r = await demoCoach.send(message);
      return { conversation_id: 'demo', reply: r.reply, quota: r.quota };
    } catch (e) {
      throw toAppError(e);
    }
  }
  return invokeFunction<CoachResponse>('ai-coach', { message, ...(conversationId ? { conversation_id: conversationId } : {}) });
}

export async function clearCoachHistory(conversationId: string | null): Promise<void> {
  if (DEMO_MODE) return demoCoach.clear();
  if (!conversationId) return;
  const { error } = await requireSupabase().from('ai_conversations').delete().eq('id', conversationId);
  if (error) throw toAppError(error);
}
