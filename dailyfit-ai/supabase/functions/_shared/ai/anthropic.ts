import Anthropic from '@anthropic-ai/sdk';

import { AIError, type AIProvider, type AIResult, type ChatRequest, type JSONRequest, parseJSONText } from './provider.ts';

/** Models that support server-side refusal fallbacks (Haiku does not). */
const supportsServerFallback = (model: string) => !model.startsWith('claude-haiku');

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    // maxRetries: one retry for 429/5xx; the per-request timeout bounds total latency.
    this.client = new Anthropic({ apiKey, maxRetries: 1 });
  }

  private async send(params: {
    model: string;
    system: string;
    messages: Anthropic.Beta.BetaMessageParam[];
    maxTokens: number;
    timeoutMs: number;
    jsonSchema?: Record<string, unknown>;
  }) {
    const fallback = supportsServerFallback(params.model);
    try {
      const res = await this.client.beta.messages.create(
        {
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.system,
          messages: params.messages,
          // Low effort keeps latency and thinking tokens down for these short, well-specified tasks.
          output_config: {
            effort: 'low',
            ...(params.jsonSchema ? { format: { type: 'json_schema', schema: params.jsonSchema } } : {}),
          },
          ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
        },
        { timeout: params.timeoutMs },
      );
      if (res.stop_reason === 'refusal') throw new AIError('refused', 'Model declined the request');
      if (res.stop_reason === 'max_tokens') throw new AIError('bad_output', 'Output truncated');
      const text = res.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return {
        text,
        model: res.model,
        usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      };
    } catch (e) {
      if (e instanceof AIError) throw e;
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AIError('timeout', 'AI request timed out');
      if (e instanceof Anthropic.RateLimitError) throw new AIError('rate_limited', 'AI rate limited');
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        throw new AIError('config', 'AI credentials rejected');
      }
      if (e instanceof Anthropic.BadRequestError) throw new AIError('config', 'AI request rejected');
      if (e instanceof Anthropic.APIError || e instanceof Anthropic.APIConnectionError) {
        throw new AIError('unavailable', 'AI provider unavailable');
      }
      throw new AIError('unavailable', 'Unexpected AI error');
    }
  }

  async generateJSON(req: JSONRequest): Promise<AIResult<unknown>> {
    const r = await this.send({
      model: req.model,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
      jsonSchema: req.jsonSchema,
    });
    return { value: parseJSONText(r.text), usage: r.usage, model: r.model };
  }

  async chat(req: ChatRequest): Promise<AIResult<string>> {
    const r = await this.send({
      model: req.model,
      system: req.system,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
    });
    if (!r.text.trim()) throw new AIError('bad_output', 'Empty reply');
    return { value: r.text.trim(), usage: r.usage, model: r.model };
  }
}
