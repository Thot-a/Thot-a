// Provider-agnostic AI interface. Business logic depends only on this file.

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface JSONRequest {
  model: string;
  system: string;
  user: string;
  /** JSON Schema for structured output. The result is still validated with Zod by the caller. */
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
}

export interface ChatRequest {
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  timeoutMs: number;
}

export type AIErrorKind = 'timeout' | 'rate_limited' | 'refused' | 'bad_output' | 'unavailable' | 'config';

export class AIError extends Error {
  constructor(readonly kind: AIErrorKind, message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export interface AIResult<T> {
  value: T;
  usage: AIUsage;
  model: string;
}

export interface AIProvider {
  readonly name: 'anthropic' | 'openai';
  /** Returns parsed JSON (unknown) — caller must validate. */
  generateJSON(req: JSONRequest): Promise<AIResult<unknown>>;
  chat(req: ChatRequest): Promise<AIResult<string>>;
}

/** USD per 1M tokens, for cost tracking only (update when prices change). */
export const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

export function estimateCostUsd(model: string, usage: AIUsage): number {
  const p = MODEL_PRICING_USD_PER_MTOK[model];
  if (!p) return 0;
  return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
}

/** Parse JSON text defensively (strips ```json fences some models add). */
export function parseJSONText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIError('bad_output', 'Model returned non-JSON output');
  }
}
