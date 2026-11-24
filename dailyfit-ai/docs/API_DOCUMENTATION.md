# DailyFit AI — API Documentation

ทุก Edge Function:
- `POST https://<project>.supabase.co/functions/v1/<name>`
- Header: `Authorization: Bearer <user access token>` (supabase-js ใส่ให้อัตโนมัติผ่าน `functions.invoke`)
- Body JSON ≤ 8 KB, validate ด้วย Zod (`supabase/functions/_shared/domain/contracts.ts`)
- Error format เดียวกันทุกตัว:

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "QUOTA_EXCEEDED", "request_id": "uuid" } }
```

| code | HTTP | ความหมาย |
|---|---|---|
| UNAUTHENTICATED | 401 | ไม่มี/หมดอายุ JWT |
| VALIDATION | 400 | body ไม่ผ่าน schema |
| QUOTA_EXCEEDED | 429 | ใช้โควตารายวันครบ (รีเซ็ตเที่ยงคืนเวลาไทย) |
| INSUFFICIENT_FOOD_DATA | 422 | เมนูที่ verified ไม่พอสำหรับเงื่อนไข — ระบบไม่แต่งข้อมูล |
| NOT_FOUND | 404 | ไม่พบรายการ (หรือไม่ใช่ของผู้ใช้) |
| AI_UNAVAILABLE | 503 | AI ล่ม (ปกติ planner จะ fallback ให้ ไม่ค่อยเห็น error นี้) |
| PAYLOAD_TOO_LARGE | 413 | body > 8 KB |
| METHOD_NOT_ALLOWED | 405 | ไม่ใช่ POST |
| INTERNAL | 500 | ข้อผิดพลาดภายใน (ดู log ด้วย request_id) |

---

## 1. `meal-planner`

### 1.1 Generate
```json
{
  "action": "generate",
  "plan_date": "2026-11-24",
  "budget_thb": 150,          // optional override (30–2000)
  "meals_per_day": 3,         // optional (2–4)
  "goal": "healthy_lifestyle",// optional
  "liked_tags": ["soup"],     // optional, allowlist
  "excluded_tags": ["pork"]   // optional, allowlist (รวมกับ dietary_restrictions ในโปรไฟล์เสมอ)
}
```
ลำดับการทำงาน: auth → validate → โหลด profile/preferences/plan tier → กรอง candidate (verified เท่านั้น; `sample` เฉพาะเมื่อ `ALLOW_SAMPLE_FOOD=true`) → ถ้าเมนูไม่พอ 422 (ไม่นับโควตา) → นับโควตา → ให้ AI เลือก short id (`f1..fN`) แบบ structured JSON → Zod + ตรวจ id/มื้อ/serving/งบ → ล้มเหลว 2 ครั้ง = deterministic fallback → `save_meal_plan` RPC คำนวณ snapshot จาก DB → ตอบกลับ

### 1.2 Swap (เปลี่ยนเฉพาะมื้อ)
```json
{ "action": "swap", "meal_plan_item_id": "uuid", "reason": "dislike" | "cheaper" | "lighter" | "more_protein" }
```
ใช้กฎ (ไม่เรียก AI → ไม่มีค่า AI) เลือกเมนูใหม่ในมื้อเดียวกันที่ผ่านข้อจำกัดเดิม และไม่ซ้ำกับมื้ออื่นในแผน

### Response (ทั้งสอง action)
```json
{
  "plan": {
    "id": "uuid", "plan_date": "2026-11-24", "goal": "healthy_lifestyle", "budget_thb": 150, "meals_per_day": 3,
    "total_kcal": 1320, "total_protein_g": 62, "total_carbs_g": 160, "total_fat_g": 40,
    "total_price_min_thb": 120, "total_price_max_thb": 160,
    "generated_by": "ai", "summary_th": "…", "uses_sample_data": false,
    "items": [{
      "id": "uuid", "meal_type": "breakfast", "position": 0, "serving_count": 1, "reason_th": "…",
      "kcal": 270, "protein_g": 14, "carbs_g": 38, "fat_g": 7, "price_min_thb": 35, "price_max_thb": 55,
      "food": { "id": "uuid", "name_th": "โจ๊กหมู", "name_en": "Pork congee", "category": "breakfast",
                "serving_description_th": "1 ถ้วย (ประมาณ 350 กรัม)", "image_path": null, "description_th": null,
                "verification_status": "verified" }
    }]
  },
  "is_estimate": true,
  "quota": { "used": 1, "limit": 2 }
}
```

## 2. `delete-account`
```json
{ "confirm": "DELETE" }
```
→ `{ "deleted": true }` · ลบ `auth.users` ด้วย service role → ข้อมูลส่วนบุคคลทั้งหมด cascade (app_events ถูก anonymise)

## 3. `ai-coach` (ยังไม่สร้าง — Phase 1 #8)
สัญญาที่ออกแบบไว้แล้วใน `contracts.ts`:
```json
// request
{ "conversation_id": "uuid (optional)", "message": "วันนี้ควรกินอะไรดี" }
// response
{ "conversation_id": "uuid", "reply": { "id": "uuid", "content": "…", "created_at": "…" }, "quota": { "used": 1, "limit": 5 } }
```

---

## 4. Direct table access (supabase-js + RLS)
| การทำงาน | Query |
|---|---|
| โปรไฟล์ | `from('profiles').select(...).eq('id', uid)` / `.update({...})` (เฉพาะคอลัมน์ที่ grant) |
| Preferences | `from('user_preferences')` |
| Consent | `insert` ลง `user_consents` (append-only), อ่าน `current_user_consents` |
| แผนวันนี้ | `from('meal_plans').select('…, items:meal_plan_items(…, food:food_items(…))').eq('plan_date', d).eq('status','active')` |
| Food diary | `from('food_logs')` CRUD — ไม่ต้อง/ไม่สามารถส่ง `user_id`, `kcal` ฯลฯ (server คำนวณ) |
| สถานะสมาชิก | `rpc('my_plan')` → `free` / `premium` |

## 5. Server-only RPCs (service_role)
`save_meal_plan`, `swap_meal_plan_item`, `consume_ai_quota`, `record_ai_usage`, `effective_plan` — ดู `docs/DATABASE.md` §4
