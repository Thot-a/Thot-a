# DailyFit AI — Database Design

> PostgreSQL 15+ บน Supabase · Schema เปลี่ยนผ่าน migration เท่านั้น (`supabase/migrations/`)

---

## 1. ER Overview

```
auth.users ─1:1─ profiles ─1:1─ user_preferences
                    │   └─1:1─ subscriptions
                    ├─1:N─ user_consents        (append-only log)
                    ├─1:N─ meal_plans ─1:N─ meal_plan_items ─N:1─ food_items ─N:1─ food_sources
                    ├─1:N─ food_logs ───────────────────────────N:1─ food_items
                    ├─1:N─ ai_conversations ─1:N─ ai_messages
                    ├─1:N─ ai_usage_daily
                    ├─1:N─ user_feedback
                    └─1:N─ app_events (user_id SET NULL เมื่อลบบัญชี)
```

ทุกตารางที่เป็นข้อมูลผู้ใช้อ้างถึง `profiles(id)` (ซึ่งอ้างถึง `auth.users(id)`) ด้วย `ON DELETE CASCADE` → ลบบัญชีครั้งเดียว ข้อมูลส่วนบุคคลถูกลบทั้งหมด

---

## 2. Enum types

| Type | ค่า |
|---|---|
| `goal_type` | healthy_lifestyle, weight_management, muscle_support, balanced_nutrition |
| `activity_level` | sedentary, light, moderate, active, very_active |
| `sex_type` | female, male, unspecified |
| `meal_type` | breakfast, lunch, dinner, snack |
| `verification_status` | unverified, sample, verified, rejected |
| `plan_status` | active, archived |
| `plan_tier` | free, premium |
| `subscription_status` | active, trialing, past_due, canceled, expired |
| `consent_type` | privacy_policy, terms, health_data, ai_personalization, analytics, marketing |
| `ai_feature` | meal_plan, meal_swap, coach |

---

## 3. Tables

### 3.1 `profiles`
| column | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade |
| display_name | text | 1–50 ตัวอักษร, nullable |
| birth_year | smallint | 1920 – (ปีปัจจุบัน − 13) |
| sex | sex_type | nullable — ใช้เพื่อคำนวณพลังงานเท่านั้น |
| height_cm | numeric(5,1) | 100–250 |
| weight_kg | numeric(5,1) | 25–300 |
| goal | goal_type | default `healthy_lifestyle` |
| activity_level | activity_level | default `light` |
| daily_budget_thb | integer | 30–2000, default 150 |
| locale | text | `th` / `en` |
| onboarding_completed_at | timestamptz | |
| created_at / updated_at | timestamptz | trigger |

สร้างอัตโนมัติด้วย trigger `on_auth_user_created` (พร้อม `user_preferences`, `subscriptions` แบบ free)

### 3.2 `user_preferences`
`user_id` PK · `meals_per_day` (2–4) · `liked_tags text[]` · `excluded_tags text[]` · `dietary_restrictions text[]` · `notification_settings jsonb` · timestamps
Tag/restriction ต้องอยู่ใน allowlist (check constraint ผ่านฟังก์ชัน `is_valid_food_tags`) — **ไม่รับข้อความอิสระ** เพื่อลด prompt injection และข้อมูลสุขภาพที่ไม่จำเป็น

### 3.3 `food_sources`
`id` · `name` (unique) · `publisher` · `url` · `license_note` · `accessed_at` · `notes` · timestamps

### 3.4 `food_items`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| slug | text unique | รหัสคงที่ เช่น `khao-kaprao-gai` |
| name_th / name_en | text | unique index บน `lower(name_th)` |
| category | text | allowlist: rice_dish, noodle, soup, curry, salad, side_dish, protein, breakfast, snack, drink, fruit |
| serving_size / serving_unit | numeric / text | เช่น 350 / g |
| serving_description_th | text | "1 จาน (ประมาณ 350 กรัม)" |
| energy_kcal, protein_g, carbs_g, fat_g | numeric | **nullable** — บังคับไม่ null เมื่อ `verified` หรือ `sample` |
| price_min_thb / price_max_thb | integer | ราคาประมาณการ แก้ไขได้ |
| meal_types | meal_type[] | มื้อที่เหมาะ |
| tags | text[] | chicken, pork, beef, seafood, egg, vegetarian, spicy, fried, … |
| image_path | text | path ใน Storage bucket `food-images` |
| description_th | text | |
| source_id | uuid FK → food_sources | บังคับเมื่อ `verified` |
| source_reference | text | รหัสรายการ/ตารางในแหล่งอ้างอิง |
| verification_status | verification_status | default `unverified` |
| verified_at / verified_by | | |
| is_active | boolean | |
| data_updated_at | date | วันที่ปรับปรุงข้อมูลโภชนาการ |

**นโยบายข้อมูล:** แถว `unverified` ไม่มีตัวเลขโภชนาการและไม่ถูกแสดง/แนะนำ · `sample` มีเฉพาะใน local/staging (`seed.sql`) · production ใช้เฉพาะ `verified`

### 3.5 `meal_plans`
`id` · `user_id` · `plan_date` · `status` · `goal` · `budget_thb` · `meals_per_day` · `total_kcal/protein_g/carbs_g/fat_g` · `total_price_min_thb/max` · `generated_by` (ai | fallback) · `summary_th` · `uses_sample_data` · `ai_model` · timestamps
Unique partial index: `(user_id, plan_date) WHERE status='active'` → แผน active ได้ 1 แผนต่อวัน

### 3.6 `meal_plan_items`
`id` · `meal_plan_id` (cascade) · `food_item_id` (restrict) · `meal_type` · `serving_count` (0.5–3) · `position` · `reason_th` (≤300) · **snapshot**: kcal/protein/carbs/fat/price_min/price_max · timestamps
Snapshot คำนวณใน SQL จาก `food_items` ตอนบันทึก → ประวัติไม่เปลี่ยนเมื่อมีการแก้ข้อมูลอาหาร
Unique `(meal_plan_id, meal_type, position)`

### 3.7 `food_logs`
`id` · `user_id` · `food_item_id` · `meal_plan_item_id` (set null) · `log_date` · `meal_type` · `serving_count` (0.25–5) · snapshot nutrition · `price_paid_thb` · `note` (≤200) · timestamps
Trigger `food_logs_compute_snapshot` คำนวณ snapshot จาก DB เสมอ (ไม่เชื่อค่าจาก client)
Index `(user_id, log_date desc)`

### 3.8 `ai_conversations` / `ai_messages`
- conversations: `id, user_id, title, last_message_at, timestamps`
- messages: `id, conversation_id, user_id, role (user|assistant), content (≤4000), input_tokens, output_tokens, ai_model, created_at`
- ผู้ใช้ **อ่าน/ลบ** ได้เฉพาะของตัวเอง; **เขียนผ่าน Edge Function (service role) เท่านั้น** เพื่อกันการปลอมข้อความ assistant

### 3.9 `subscriptions`
`user_id` PK · `plan` · `status` · `provider` · `provider_ref` · `current_period_end` · timestamps · ผู้ใช้อ่านได้อย่างเดียว

### 3.10 `user_feedback`
`id, user_id, feedback_type (meal_plan|food_item|coach_message|app), target_id, rating (1–5), comment (≤1000), created_at`

### 3.11 `user_consents` (append-only)
`id, user_id, consent_type, granted, policy_version, created_at` · ห้าม update/delete โดยผู้ใช้ (เป็นหลักฐาน) · view `current_user_consents` คืนสถานะล่าสุดต่อประเภท

### 3.12 ตารางเสริม
- `ai_usage_daily (user_id, usage_date, feature)` PK — `request_count, input_tokens, output_tokens, est_cost_usd` → ใช้คุม quota + ต้นทุน
- `app_events` — analytics ภายใน (event allowlist, properties ≤ 2KB, ไม่มีข้อมูลสุขภาพ)

---

## 4. Functions & Triggers

| ชื่อ | ประเภท | หน้าที่ |
|---|---|---|
| `set_updated_at()` | trigger | อัปเดต `updated_at` |
| `handle_new_user()` | trigger on `auth.users` | สร้าง profile/preferences/subscription |
| `food_logs_compute_snapshot()` | trigger | คำนวณ snapshot จาก `food_items` |
| `effective_plan(uid)` | SQL, security definer | `premium` เฉพาะ status active/trialing และยังไม่หมดอายุ |
| `save_meal_plan(user_id, plan jsonb)` | plpgsql, **service_role เท่านั้น** | archive แผนเดิมของวัน + insert แผนใหม่ + snapshot แบบ atomic |
| `swap_meal_plan_item(user_id, item_id, food_id, reason, allow_sample)` | plpgsql, service_role | เปลี่ยนเมนูหนึ่งมื้อ + คำนวณ snapshot/ยอดรวมใหม่ |
| `my_plan()` | SQL, security definer | ผู้ใช้อ่านสถานะสมาชิกของตัวเอง |
| `consume_ai_quota(user_id, feature, limit)` | plpgsql, service_role | นับ request แบบ atomic, คืน false ถ้าเกิน |
| `record_ai_usage(user_id, feature, in, out, cost)` | plpgsql, service_role | บันทึก token/ต้นทุน |

---

## 5. Row Level Security (สรุป)

| ตาราง | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | own | (trigger) | own | – (ลบผ่าน delete-account) |
| user_preferences | own | (trigger) | own | – |
| food_sources | anon+auth | – | – | – |
| food_items | `is_active AND status IN (verified, sample)` | – | – | – |
| meal_plans / items | own | service_role (RPC) | own (status เท่านั้นผ่าน column grant) | own |
| food_logs | own | own | own | own |
| ai_conversations | own | service_role | own (title) | own |
| ai_messages | own | service_role | – | (cascade) |
| subscriptions | own | service_role | service_role | – |
| user_feedback | own | own | – | – |
| user_consents | own | own | – | – |
| ai_usage_daily | own | service_role | service_role | – |
| app_events | – | own (allowlist) | – | – |

หมายเหตุ: `service_role` ข้าม RLS โดยธรรมชาติ ใช้เฉพาะใน Edge Functions

---

## 6. Migrations

| ไฟล์ | เนื้อหา |
|---|---|
| `20261124000001_core_schema.sql` | enums, tables, indexes, constraints, triggers |
| `20261124000002_rls_policies.sql` | เปิด RLS + policies + grants |
| `20261124000003_functions.sql` | RPC: effective_plan, save_meal_plan, quota |
| `20261124000004_food_catalog.sql` | food_sources อ้างอิง + รายการอาหาร 37 เมนู (สถานะ `unverified`, ไม่มีตัวเลขโภชนาการ) |
| `20261124000005_swap_meal_item.sql` | RPC `swap_meal_plan_item` (service_role) |
| `supabase/seed.sql` | **local เท่านั้น** — ตัวเลขตัวอย่าง (`sample`) เพื่อพัฒนา UI |

การทดสอบ: `npm run test:db` รัน migrations + `supabase/tests/*.sql` บน PostgreSQL (มี stub ของ `auth` schema) เพื่อตรวจ constraint และ RLS

---

## 7. การนำเข้าข้อมูลโภชนาการจริง (Data pipeline)

1. เลือกแหล่ง: ตารางแสดงคุณค่าทางโภชนาการของอาหารไทย (สถาบันโภชนาการ ม.มหิดล — Thai FCD) และ/หรือ ข้อมูลที่ฉลากผู้ผลิต/ร้าน — **ตรวจสอบเงื่อนไขลิขสิทธิ์/การใช้งานเชิงพาณิชย์ก่อน**
2. กรอกลง CSV ตามรูปแบบ `docs/food-import-template.csv` (Phase 1.5) พร้อม `source_reference`
3. ผู้ตรวจ (ควรเป็นนักกำหนดอาหาร) ตรวจ → ตั้ง `verification_status='verified'`, `verified_by`, `verified_at`
4. นำเข้าผ่าน migration/script ที่ใช้ service role — ไม่มีช่องทางแก้ไขจากแอป
