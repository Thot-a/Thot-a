/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { DIETARY_RESTRICTIONS, FOOD_TAGS, GOALS, MEAL_TYPES, RESTRICTION_EXCLUDES } from '@shared/constants';

const sql = readFileSync(path.resolve(__dirname, '../../supabase/migrations/20261124000001_core_schema.sql'), 'utf8');

function sqlArray(fnName: string): string[] {
  const m = sql.match(new RegExp(`function public\\.${fnName}\\(\\)[\\s\\S]*?array\\[([\\s\\S]*?)\\]::text\\[\\]`));
  if (!m) throw new Error(`allowlist ${fnName} not found`);
  return [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!);
}

function sqlEnum(name: string): string[] {
  const m = sql.match(new RegExp(`create type public\\.${name} as enum \\(([^)]*)\\)`));
  if (!m) throw new Error(`enum ${name} not found`);
  return [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!);
}

describe('constants stay in sync with SQL', () => {
  it('food tags', () => expect([...FOOD_TAGS].sort()).toEqual(sqlArray('allowed_food_tags').sort()));
  it('dietary restrictions', () =>
    expect([...DIETARY_RESTRICTIONS].sort()).toEqual(sqlArray('allowed_dietary_restrictions').sort()));
  it('goals', () => expect([...GOALS]).toEqual(sqlEnum('goal_type')));
  it('meal types', () => expect([...MEAL_TYPES]).toEqual(sqlEnum('meal_type')));
  it('every restriction maps only to known tags', () => {
    for (const tags of Object.values(RESTRICTION_EXCLUDES)) for (const t of tags) expect(FOOD_TAGS).toContain(t);
  });
});
