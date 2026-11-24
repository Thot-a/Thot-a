# DailyFit AI — Development Roadmap

> งบประมาณ: ≤ €500 ใน 3 เดือนแรก · ทีม: เจ้าของโปรเจกต์ + Claude Code
> หลัก: ทำ Core loop ให้ใช้ได้จริงก่อน (สมัคร → กรอกข้อมูล → ได้แผนอาหาร → บันทึกการกิน → ดูสรุป)

---

## Phase 0 — Foundation (สัปดาห์ที่ 1) ← **กำลังทำ**
- [x] ตรวจสภาพแวดล้อม, สร้าง Expo SDK 58 + TypeScript + Expo Router
- [x] เอกสารหลัก (README, CLAUDE.md, ARCHITECTURE, DATABASE, ROADMAP, SECURITY)
- [x] SQL migrations: schema + RLS + RPC + food catalog (unverified)
- [x] DB test harness (PostgreSQL + auth stub) สำหรับ constraint/RLS
- [x] Design system (tokens, Noto Sans Thai, Button/Card/Input/Screen/States)
- [x] Supabase client (SecureStore session), env validation
- [x] Auth: สมัคร / เข้าสู่ระบบ / ลืมรหัสผ่าน / ออกจากระบบ / session routing
- [ ] **ต้องการจากเจ้าของ:** สร้าง Supabase project + ใส่ URL/anon key ใน `.env`

## Phase 1 — Core MVP (สัปดาห์ที่ 2–5)
| ลำดับ | Feature | สถานะ |
|---|---|---|
| 1 | Onboarding + consent (ข้ามข้อมูลที่ไม่จำเป็นได้) | ◐ เริ่มแล้ว |
| 2 | User Profile (อ่าน/แก้ไข) | ☐ |
| 3 | Food Database: นำเข้าข้อมูล **verified** ชุดแรก ≥ 40 เมนู | ☐ ต้องมีผู้ตรวจ |
| 4 | Home Dashboard | ☐ |
| 5 | Meal Planner UI (แสดงแผน, เปลี่ยนมื้อ, บันทึก) | ☐ |
| 6 | Food Diary (CRUD + ประวัติ) | ☐ |
| 7 | AI Meal Planner (Edge Function, hybrid + fallback) | ◐ logic + tests เสร็จ, ยังไม่ deploy |
| 8 | AI Coach (Edge Function + chat UI) | ☐ |
| 9 | Progress (สถิติรายสัปดาห์, กราฟ) | ☐ |
| 10 | Settings (consent, ลบบัญชี, logout) | ☐ |

Definition of Done ต่อ feature: ดู `CLAUDE.md` §DoD

## Phase 2 — Beta ปิด (สัปดาห์ที่ 6–8)
- EAS Build (development + preview) → TestFlight / Internal testing (20–50 คน)
- Internal analytics views (activation, D1/D7 retention, AI cost/user)
- Feedback loop (`user_feedback`), ปรับ prompt/quota
- Custom SMTP, Privacy Policy/Terms (ตรวจทางกฎหมาย)
- แผนรายสัปดาห์ (Premium)

## Phase 3 — Public launch (สัปดาห์ที่ 9–12)
- In-App Purchase (RevenueCat หรือ native) + `billing-webhook`
- App Store / Google Play submission (Data safety, Privacy nutrition labels)
- Supabase Pro, backups, monitoring

## หลัง 3 เดือน (ยังไม่ทำ)
AI Fitness · AI Sleep · AI Wellness · Personal Lifestyle Coach · Social login · ถ่ายรูปอาหาร

---

## ความเสี่ยงหลัก
| ความเสี่ยง | ผลกระทบ | การลดความเสี่ยง |
|---|---|---|
| ไม่มีข้อมูลโภชนาการที่ verified | แนะนำอาหารไม่ได้จริง | จัดหานักกำหนดอาหาร/ใช้แหล่งที่อนุญาตใช้งาน เริ่มเร็วที่สุด |
| ต้นทุน AI เกินงบ | ขาดทุนต่อผู้ใช้ free | quota, deterministic fallback, เลือก model ตามต้นทุน, cache |
| ข้อกำหนดสโตร์ด้านสุขภาพ/IAP | ถูก reject | disclaimer, ไม่วินิจฉัย, IAP |
| PDPA | ความเสี่ยงทางกฎหมาย | consent, minimization, ลบบัญชี, ตรวจโดยนักกฎหมาย |
| Supabase free pause หลังไม่ใช้งาน 7 วัน | staging ล่ม | ใช้ Pro ก่อน beta |
