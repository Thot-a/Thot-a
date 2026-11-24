// OpenAI adapter (REST via fetch — no SDK dependency). Selected with AI_PROVIDER=openai.
import { AIError, type AIProvider, type AIResult, type ChatRequest, type JSONRequest, parseJSONText } from './provider.ts';

interface ChatCompletion {
  model: string;
  choices: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;
  constructor(private readonly apiKey: string) {}

  private async complete(body: Record<string, unknown>, timeoutMs: number): Promise<ChatCompletion> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 429) throw new AIError('rate_limited', 'AI rate limited');
      if (res.status === 401 || res.status === 403 || res.status === 400) throw new AIError('config', `AI request rejected (${res.status})`);
      if (!res.ok) throw new AIError('unavailable', `AI provider error (${res.status})`);
      return (await res.json()) as ChatCompletion;
    } catch (e) {
      if (e instanceof AIError) throw e;
      if (e instanceof DOMException && e.name === 'AbortError') throw new AIError('timeout', 'AI request timed out');
      throw new AIError('unavailable', 'AI provider unreachable');
    } finally {
      clearTimeout(timer);
    }
  }

  private extract(c: ChatCompletion) {
    const choice = c.choices[0];
    if (!choice) throw new AIError('bad_output', 'No choices');
    if (choice.message.refusal) throw new AIError('refused', 'Model declined the request');
    if (choice.finish_reason === 'length') throw new AIError('bad_output', 'Output truncated');
    return {
      text: choice.message.content ?? '',
      usage: { inputTokens: c.usage?.prompt_tokens ?? 0, outputTokens: c.usage?.completion_tokens ?? 0 },
      model: c.model,
    };
  }

  async generateJSON(req: JSONRequest): Promise<AIResult<unknown>> {
    const c = await this.complete(
      {
        model: req.model,
        max_completion_tokens: req.maxTokens,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: req.jsonSchema } },
      },
      req.timeoutMs,
    );
    const r = this.extract(c);
    return { value: parseJSONText(r.text), usage: r.usage, model: r.model };
  }

  async chat(req: ChatRequest): Promise<AIResult<string>> {
    const c = await this.complete(
      {
        model: req.model,
        max_completion_tokens: req.maxTokens,
        messages: [{ role: 'system', content: req.system }, ...req.messages],
      },
      req.timeoutMs,
    );
    const r = this.extract(c);
    if (!r.text.trim()) throw new AIError('bad_output', 'Empty reply');
    return { value: r.text.trim(), usage: r.usage, model: r.model };
  }
}
