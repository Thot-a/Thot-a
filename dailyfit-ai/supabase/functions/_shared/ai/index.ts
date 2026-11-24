import { AnthropicProvider } from './anthropic.ts';
import { OpenAIProvider } from './openai.ts';
import { AIError, type AIProvider } from './provider.ts';

export * from './provider.ts';

export interface AIConfig {
  provider: AIProvider;
  plannerModel: string;
  coachModel: string;
  timeoutMs: number;
}

/** Builds the provider from environment. API keys never leave the server. */
export function aiFromEnv(env: { get(key: string): string | undefined }): AIConfig {
  const name = (env.get('AI_PROVIDER') ?? 'anthropic').toLowerCase();
  const timeoutMs = clampInt(env.get('AI_TIMEOUT_MS'), 20_000, 5_000, 60_000);
  if (name === 'anthropic') {
    const key = env.get('ANTHROPIC_API_KEY');
    if (!key) throw new AIError('config', 'ANTHROPIC_API_KEY missing');
    return {
      provider: new AnthropicProvider(key),
      plannerModel: env.get('AI_MODEL_PLANNER') ?? 'claude-opus-5-5',
      coachModel: env.get('AI_MODEL_COACH') ?? 'claude-opus-5-5',
      timeoutMs,
    };
  }
  if (name === 'openai') {
    const key = env.get('OPENAI_API_KEY');
    if (!key) throw new AIError('config', 'OPENAI_API_KEY missing');
    const plannerModel = env.get('AI_MODEL_PLANNER');
    const coachModel = env.get('AI_MODEL_COACH');
    if (!plannerModel || !coachModel) throw new AIError('config', 'AI_MODEL_PLANNER / AI_MODEL_COACH required for openai');
    return { provider: new OpenAIProvider(key), plannerModel, coachModel, timeoutMs };
  }
  throw new AIError('config', `Unknown AI_PROVIDER ${name}`);
}

function clampInt(raw: string | undefined, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}
