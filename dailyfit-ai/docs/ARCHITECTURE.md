# DailyFit AI — System Architecture

> สถานะ: v0.1 (Foundation) · ปรับปรุงล่าสุด 2026-11-24
> เอกสารนี้อธิบายสถาปัตยกรรมระบบทั้งหมด การตัดสินใจทางเทคนิค และเหตุผลเบื้องหลัง

---

## 1. ภาพรวม (High-level)

```
┌──────────────────────────────┐
│  Mobile App (iOS / Android)  │  Expo SDK 58 · React Native · TypeScript · Expo Router
│  - UI / Design System        │
│  - services/ (data access)   │  ใช้ anon key + JWT ของผู้ใช้เท่านั้น
│  - domain/ (pure logic)      │
└──────────────┬───────────────┘
               │ HTTPS (supabase-js)
               ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase                                                      │
│  ┌────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │ Auth (JWT) │  │ PostgreSQL + RLS  │  │ Storage         │  │
│  └────────────┘  │ profiles, food_*, │  │ food-images     │  │
│                  │ meal_plans, logs… │  │ (public read)   │  │
│                  └─────────▲─────────┘  └─────────────────┘  │
│  ┌───────────────────────────┴─────────────────────────────┐ │
│  │ Edge Functions (Deno)                                   │ │
│  │  meal-planner · ai-coach · delete-account               │ │
│  │  _shared/: auth, quota, validation (Zod), ai/ providers │ │
│  └───────────────────────────┬─────────────────────────────┘ │
└──────────────────────────────┼───────────────────────────────┘
                               │ HTTPS (server-side API key เท่านั้น)
                               ▼
                    ┌─────────────────────┐
                    │ LLM Provider        │  Anthropic (ค่าเริ่มต้น) / OpenAI
                    │ (สลับได้ผ่าน ENV)    │
                    └─────────────────────┘
```

### หลักการสำคัญ

1. **Client ไม่ถือความลับ** — แอปมีเพียง `SUPABASE_URL` และ `SUPABASE_ANON_KEY` (ค่าสาธารณะโดยการออกแบบ) ความปลอดภัยของข้อมูลมาจาก RLS ไม่ใช่จากการซ่อน key
2. **AI ไม่ใช่แหล่งความจริงของตัวเลข** — ตัวเลขโภชนาการ/ราคา มาจาก `food_items` เสมอ AI เลือกได้เฉพาะ `food_id` จากรายการที่ server ส่งให้
3. **ใช้ AI เฉพาะที่ต้องใช้** — การกรองอาหาร, คำนวณพลังงาน, ตรวจงบประมาณ, สรุปสถิติ ทำด้วย SQL/TypeScript ปกติ (ถูกกว่าและตรวจสอบได้)
4. **Server เป็นผู้ตัดสินสิทธิ์** — สถานะ Premium, โควตา AI, การเขียนข้อมูลส่วนกลาง ตรวจที่ Edge Function / RLS เท่านั้น
5. **Provider-agnostic** — Business logic เรียกผ่าน interface `AIProvider` เปลี่ยนผู้ให้บริการได้ด้วย ENV

---

## 2. Mobile App

| เรื่อง | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | Expo SDK 58 + React Native 0.88 | Codebase เดียว iOS/Android, EAS Build/Update ไม่ต้องมี Mac สำหรับ build |
| Routing | Expo Router (file-based, `src/app/`) | Deep link/typed routes มาในตัว |
| ภาษา | TypeScript strict | ลด bug, refactor ได้ปลอดภัย |
| Server state | `@tanstack/react-query` | Cache, loading/error state, retry, invalidate — ลดโค้ดซ้ำ |
| Auth session | `@supabase/supabase-js` + `expo-secure-store` (ผ่าน adapter) | เก็บ refresh token ใน Keychain/Keystore ไม่ใช่ AsyncStorage แบบ plain |
| Font | Noto Sans Thai (`@expo-google-fonts/noto-sans-thai`) | แสดงผลไทยถูกต้อง สระ/วรรณยุกต์ไม่ซ้อน |
| Validation | Zod | ใช้ schema เดียวกันแนวคิดเดียวกับ server |
| Testing | Vitest (pure logic) | เร็ว ไม่ต้องใช้ native runtime |

### Layering ในแอป

```
src/app/         ← Screens (route files) — ประกอบ UI + เรียก hooks เท่านั้น
src/components/  ← UI ที่ใช้ซ้ำ (ui/ = design system, อื่น ๆ = feature components)
src/hooks/       ← React Query hooks (useProfile, useTodayPlan, …)
src/services/    ← Data access: เรียก Supabase / Edge Functions, map error
src/domain/      ← Pure business logic (คำนวณ, validation) — ไม่มี import React/Supabase
src/lib/         ← การตั้งค่า client (supabase, queryClient, env)
src/constants/   ← theme tokens, ค่าคงที่
src/types/       ← types ของ DB / API contract
```

กฎ: Screen ห้ามเรียก `supabase` ตรง ๆ, `domain/` ห้ามมี side effect

---

## 3. Backend (Supabase)

### 3.1 Data access patterns

| การทำงาน | ช่องทาง | เหตุผล |
|---|---|---|
| อ่าน/เขียนข้อมูลของตัวเอง (profile, preferences, food_logs, consents) | supabase-js ตรง + RLS | ง่าย ไม่มีค่า function invocation |
| อ่าน food database | supabase-js ตรง (RLS: อ่านเฉพาะ `verified`/`active`) | ข้อมูลสาธารณะ |
| สร้าง/เปลี่ยนแผนอาหาร | Edge Function `meal-planner` | ต้องใช้ AI + ตรวจ quota + ตรวจผล |
| คุยกับ AI Coach | Edge Function `ai-coach` | ต้องใช้ AI + ตัดบริบท + quota |
| ลบบัญชี | Edge Function `delete-account` | ต้องใช้ service role เพื่อลบ `auth.users` |
| สถานะสมาชิก | เขียนโดย server เท่านั้น (webhook ในอนาคต) | ห้ามเชื่อ client |

### 3.2 Edge Functions

```
supabase/functions/
  _shared/
    cors.ts            CORS + JSON response helpers
    auth.ts            ตรวจ JWT → user id (ทุก request)
    supabase.ts        สร้าง client (user-scoped / service-role)
    quota.ts           ตรวจ + นับโควตา AI ต่อวันตาม plan
    contracts.ts       Zod schema ของ request/response (shared types กับแอป)
    meal-planner/      logic ล้วน: candidate filter, prompt builder, validator
    ai/
      provider.ts      interface AIProvider
      anthropic.ts     adapter (Anthropic SDK)
      openai.ts        adapter (OpenAI REST)
      index.ts         เลือก provider จาก ENV
  meal-planner/index.ts
  ai-coach/index.ts
  delete-account/index.ts
```

ทุก function ทำตามลำดับ: `CORS → auth → validate input (Zod) → quota → logic → validate output → persist → respond`

### 3.3 AI Meal Planner (Hybrid)

```
1  verify JWT                         (auth.ts)
2  load profile + preferences         (DB, user-scoped client → RLS ยังทำงาน)
3  compute daily targets              (domain: Mifflin-St Jeor → ช่วงพลังงาน, ไม่ใช่การวินิจฉัย)
4  filter candidates in SQL/TS        (status=verified, ไม่มี allergen/excluded tags, ราคา ≤ งบ)
5  if candidates ไม่พอ → 422 INSUFFICIENT_FOOD_DATA (ไม่แต่งข้อมูล)
6  prompt AI ด้วยรายการ candidate แบบย่อ (id, ชื่อ, หมวด, kcal, P/C/F, ราคา)
7  AI ตอบ Structured JSON (json_schema) → Zod validate
8  ตรวจ: food_id อยู่ใน candidate set, meal_type ครบ, serving 0.5–3
9  คำนวณโภชนาการ/ราคารวมจาก DB (ไม่ใช้ตัวเลขจาก AI)
10 ตรวจงบประมาณ — ถ้าเกิน: ลอง fallback แบบ deterministic (greedy) หนึ่งครั้ง
11 บันทึก meal_plans + meal_plan_items (transaction ผ่าน RPC)
12 ตอบกลับแอป พร้อม flag `is_estimate`, `uses_sample_data`
```

**Fallback ไม่ใช้ AI:** ถ้า AI timeout/ตอบผิดรูปแบบ 2 ครั้ง ระบบใช้ deterministic planner (เลือกตามเป้าหมาย + งบ) แทน → ผู้ใช้ยังได้แผน และค่าใช้จ่ายไม่บาน

### 3.4 AI Coach

- ส่งเฉพาะบริบทที่จำเป็น: สรุป profile (เป้าหมาย, งบ, ข้อจำกัดอาหาร) **เมื่อมี consent `ai_personalization`**, แผนวันนี้, ยอดที่บันทึกวันนี้, รายการอาหาร top-N ที่เกี่ยวข้อง
- ประวัติ: ส่ง N ข้อความล่าสุด (ค่าเริ่มต้น 10) + ตัดความยาวข้อความผู้ใช้ ≤ 1,000 ตัวอักษร
- ข้อมูลผู้ใช้ถูกห่อใน `<user_data>` และ system prompt ระบุว่าเป็นข้อมูล ไม่ใช่คำสั่ง (ลด prompt injection)
- Guardrails ใน system prompt: ไม่วินิจฉัย/ไม่สั่งยา/ไม่แนะนำอดอาหารอันตราย/แนะนำพบผู้เชี่ยวชาญ
- คำตอบไม่เกิน `max_tokens` ที่กำหนด, บันทึก token usage ลง `ai_usage_daily`

### 3.5 AI Provider abstraction

```ts
interface AIProvider {
  name: 'anthropic' | 'openai';
  generateJSON<T>(req: JSONRequest<T>): Promise<AIResult<T>>;   // structured output + Zod
  chat(req: ChatRequest): Promise<AIResult<string>>;
}
```

- ENV: `AI_PROVIDER`, `AI_MODEL_PLANNER`, `AI_MODEL_COACH`, `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`, `AI_TIMEOUT_MS`
- Timeout ด้วย `AbortController`, retry สูงสุด 1 ครั้งเมื่อ 429/5xx
- ทุกผลลัพธ์คืน `usage { input_tokens, output_tokens }` เพื่อคิดต้นทุน

---

## 4. Subscription architecture

```
subscriptions (1 แถวต่อ user)
  plan: free | premium     status: active | trialing | past_due | canceled | expired
  provider: none | app_store | google_play | stripe | manual
  current_period_end, provider_ref
```

- แอป **อ่าน** ได้อย่างเดียว (RLS) — เขียนโดย service role เท่านั้น
- ฟังก์ชัน SQL `public.effective_plan(uid)` คืน `premium` เฉพาะเมื่อ status ถูกต้องและยังไม่หมดอายุ
- อนาคต: RevenueCat หรือ webhook ของ App Store Server Notifications / Google RTDN → Edge Function `billing-webhook` → อัปเดต `subscriptions`
- **การขายสมาชิกในแอปบน iOS/Android ต้องใช้ In-App Purchase ตามนโยบายสโตร์** (ต้องตรวจสอบนโยบายล่าสุดก่อนเปิดขาย)

### Quota (ค่าเริ่มต้น ปรับได้ใน `quota.ts`)

| | Free | Premium |
|---|---|---|
| สร้างแผนอาหาร / วัน | 2 | 10 |
| เปลี่ยนเมนู (swap) / วัน | 3 | 30 |
| ข้อความ AI Coach / วัน | 5 | 50 |
| แผนรายสัปดาห์ | – | ✓ (Phase 2) |

---

## 5. Analytics (privacy-first)

- Phase 1: ตาราง `app_events` ภายใน Supabase — เก็บเฉพาะชื่อ event + metadata ที่ไม่ใช่ข้อมูลสุขภาพ (เช่น `meal_plan_generated`, `food_logged`, `coach_message_sent`) ไม่มีน้ำหนัก/ส่วนสูง/ชื่ออาหารที่ระบุตัวตน
- Metrics (signups, DAU/WAU, retention D1/D7, plan generation rate, AI cost/user) คำนวณด้วย SQL view ฝั่ง server
- ยังไม่ใช้บริการ analytics ภายนอก หากเพิ่มในอนาคตต้องผ่าน consent `analytics` และไม่ส่งข้อมูลสุขภาพ

---

## 6. Environments

| Env | Supabase | AI | ข้อมูลอาหาร |
|---|---|---|---|
| local | `supabase start` (Docker) หรือ Postgres ในเครื่องสำหรับเทสต์ SQL | key ส่วนตัว / mock provider | `seed.sql` (sample, ติดป้ายชัดเจน) |
| staging | Supabase project แยก (free tier) | key แยก + งบต่ำ | verified + sample (flag) |
| production | Supabase Pro | key production + spend limit | verified เท่านั้น |

ตัวแปร `ALLOW_SAMPLE_FOOD=true` ใช้ได้เฉพาะ local/staging; ผลลัพธ์ที่ใช้ข้อมูล sample จะมี `uses_sample_data: true` และ UI แสดงแบนเนอร์ "ข้อมูลตัวอย่าง ยังไม่ผ่านการตรวจสอบ"

---

## 7. Decision log

| # | การตัดสินใจ | ทางเลือกที่ไม่เลือก | เหตุผล |
|---|---|---|---|
| D1 | `src/app/` แทน `app/` | root `app/` | แยก route ออกจาก config files; Expo Router รองรับทั้งสอง |
| D2 | React Query แทน Redux/Zustand | Redux | ข้อมูลส่วนใหญ่เป็น server state |
| D3 | Edge Functions เฉพาะงาน AI/สิทธิ์พิเศษ | ทุกอย่างผ่าน function | ลด invocation cost; RLS ปลอดภัยพออยู่แล้ว |
| D4 | Nutrition จาก DB เท่านั้น | ให้ AI ประมาณ | ตรวจสอบได้, ไม่แต่งข้อมูล |
| D5 | Deterministic fallback planner | ให้ error | UX ดีและคุมต้นทุน |
| D6 | Analytics ภายใน DB | Mixpanel/Amplitude | PDPA + งบ |
| D7 | Model ตั้งผ่าน ENV | hardcode | เจ้าของโปรเจกต์ตัดสินใจเรื่องต้นทุน/คุณภาพได้เอง (ดูหัวข้อค่าใช้จ่ายใน README) |
