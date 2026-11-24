# CLAUDE.md — DailyFit AI

Guidance for Claude Code (and humans) working in this repository. Read this before changing code.

## Product in one line
AI meal planner + lifestyle coach for Thai office workers (25–40). Thai-first UI. Not a calorie counter, not a medical app.

## Non-negotiable rules
1. **No secrets in the app.** Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may appear in client code. AI keys and the service-role key live only in Supabase function secrets.
2. **AI is called only from Edge Functions** (`supabase/functions/*`) through the `AIProvider` interface in `_shared/ai/`.
3. **AI never invents food IDs or nutrition numbers.** It may only choose `food_id`s from the candidate list the server supplies. Totals are computed from `food_items` (in SQL/TS). Validate every AI response with Zod, then check every ID against the candidate set.
4. **Never fabricate nutrition data.** Rows without a verifiable source stay `unverified` (no numbers). Dev placeholders live only in `supabase/seed.sql` with status `sample` and must be visibly labelled in the UI.
5. **Server decides entitlements.** Premium status = `public.effective_plan(uid)`. Never trust a plan/tier sent by the client.
6. **RLS on every public table.** New table ⇒ enable RLS + policies + a test in `supabase/tests/`.
7. **No health data in logs or analytics.** Log error codes and request ids, not message content, weights, or emails.
8. **Health guardrails:** no diagnosis, no medication advice, no dangerous fasting, no guaranteed weight results; recommend a professional for medical conditions.
9. **No paid services or purchases** without the project owner's explicit approval (state estimated cost first).
10. Don't claim PDPA/legal compliance. Say "designed to support".

## Expo specifics (SDK 58 — newer than most training data)
- Expo changes every SDK. Before using an Expo/RN API, check the installed version and the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`, index at `https://docs.expo.dev/llms.txt`). Don't trust memory.
- Install native-ish packages with `npx expo install <pkg>` (in this sandbox, `EXPO_OFFLINE=1 npx expo install` because api.expo.dev is blocked).
- Routes live in `src/app/`. Only route files go there.
- Never hand-edit `ios/` or `android/` (CNG). Configure via `app.json` + config plugins.

## Architecture & layering
```
src/app/         screens: compose components + hooks; no direct supabase calls
src/components/  ui/ = design system primitives; feature folders for composites
src/hooks/       React Query hooks wrapping services
src/services/    all Supabase / Edge Function calls; map errors to AppError
src/domain/      pure functions (no React, no I/O) — unit tested
src/lib/         supabase client, query client, env
supabase/functions/_shared/  server logic; pure parts are unit tested from Node via Vitest
```
API contracts (Zod) live in `supabase/functions/_shared/contracts.ts`; the app imports **types only** from there via `src/types/api.ts`.

## Commands
```bash
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint (eslint-config-expo)
npm test              # vitest (domain + edge function pure logic)
npm run test:db       # apply migrations + SQL tests on a throwaway local Postgres DB
npm run check         # all of the above except test:db
npx expo start
```

## Definition of Done (per feature)
1. UI works on small (iPhone SE) and large screens  2. Real backend connected  3. Reads/writes real data
4. Input validation (client + server/DB)  5. Loading state  6. Error state  7. Empty state
8. RLS/authorization reviewed + SQL test  9. Tests pass (`npm run check`, `npm run test:db`)
10. No TypeScript errors  11. Docs updated (API/DB/ROADMAP)  12. No regressions
Never report a feature as done without running the checks. If something could not be verified (e.g. no device/simulator, no Supabase project), say so explicitly.

## Style
- TypeScript strict, no `any` (use `unknown` + Zod). Named exports for non-route modules.
- UI copy in Thai, natural and friendly; keep strings in the component for now (i18n later via `src/constants/strings`).
- Use theme tokens from `src/constants/theme.ts`; no hard-coded colors.
- Every list screen: loading skeleton/spinner, empty state with a next action, error state with retry.
- Mock data must be clearly marked and kept out of production paths.

## Design tokens
Forest `#244436` · Sage `#A9BEA6` · Cream `#F5F4EC` · White `#FFFFFF` · Charcoal `#252B27` · Accent `#E8A45B` · Font: Noto Sans Thai.

## Open decisions (ask the owner, don't assume)
- AI model per feature (cost vs quality) — see README cost table.
- Source/licence of verified Thai nutrition data and who verifies it.
- Supabase region (recommend ap-southeast-1) and project creation.
