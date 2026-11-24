/// <reference types="node" />
// Guards against shipping secrets in the mobile bundle (SECURITY_CHECKLIST 1.2).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const CLIENT_DIRS = ['src', 'supabase/functions/_shared/domain'];
const CLIENT_FILES = ['app.json', '.env.example'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = [...CLIENT_DIRS.flatMap((d) => walk(path.join(root, d))), ...CLIENT_FILES.map((f) => path.join(root, f))];

describe('client bundle hygiene', () => {
  it('contains no server secrets or secret env names', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/service_role|SERVICE_ROLE|ANTHROPIC_API_KEY|OPENAI_API_KEY|sk-ant-|sk-proj-/);
    }
  });

  it('only whitelisted EXPO_PUBLIC_ variables are used', () => {
    const allowed = new Set(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/EXPO_PUBLIC_[A-Z0-9_]+/g)) expect(allowed, `${f}: ${m[0]}`).toContain(m[0]);
    }
  });

  it('app code never imports Supabase directly from screens', () => {
    for (const f of walk(path.join(root, 'src/app'))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/from '@\/lib\/supabase'/);
    }
  });
});
