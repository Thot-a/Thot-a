import type { ApiErrorBody, ApiErrorCode } from './domain/contracts.ts';

// Mobile apps don't need CORS, but Expo web / tooling do. No credentials are sent via cookies.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  VALIDATION: 400,
  QUOTA_EXCEEDED: 429,
  INSUFFICIENT_FOOD_DATA: 422,
  NOT_FOUND: 404,
  AI_UNAVAILABLE: 503,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
};

export class HttpError extends Error {
  constructor(readonly code: ApiErrorCode, message: string = code) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
}

export function errorResponse(code: ApiErrorCode, requestId: string, message?: string): Response {
  const body: ApiErrorBody = { error: { code, message: message ?? code, request_id: requestId } };
  return json(body, STATUS[code]);
}

const MAX_BODY_BYTES = 8 * 1024;

export async function readJsonBody(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > MAX_BODY_BYTES) throw new HttpError('PAYLOAD_TOO_LARGE');
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError('PAYLOAD_TOO_LARGE');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError('VALIDATION', 'Body must be JSON');
  }
}

/** Structured log without personal data: never pass message content, emails or body metrics here. */
export function log(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, string | number | boolean> = {}) {
  console[level](JSON.stringify({ level, event, ...fields }));
}

/** Wraps a handler with CORS, method check, request id and uniform error handling. */
export function handle(fn: (req: Request, requestId: string) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    const requestId = crypto.randomUUID();
    if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', requestId);
    try {
      return await fn(req, requestId);
    } catch (e) {
      if (e instanceof HttpError) return errorResponse(e.code, requestId, e.message);
      log('error', 'unhandled', { request_id: requestId, error: e instanceof Error ? e.name : 'unknown' });
      return errorResponse('INTERNAL', requestId);
    }
  };
}
