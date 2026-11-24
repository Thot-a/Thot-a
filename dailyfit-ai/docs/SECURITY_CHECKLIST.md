# DailyFit AI — Security & Privacy Checklist

> ข้อมูลสุขภาพและพฤติกรรมการกินเป็นข้อมูลอ่อนไหว (PDPA มาตรา 26 จัด "ข้อมูลสุขภาพ" เป็นข้อมูลส่วนบุคคลประเภทพิเศษ)
> **ระบบนี้ยังไม่ได้รับการตรวจสอบทางกฎหมาย** — ห้ามอ้างว่า "ปฏิบัติตาม PDPA ครบถ้วน" จนกว่าจะผ่านการตรวจสอบโดยผู้เชี่ยวชาญด้านกฎหมาย

สถานะ: ☐ ยังไม่ทำ · ◐ ทำบางส่วน · ☑ ทำแล้วและทดสอบแล้ว

---

## 1. Secrets & Keys
| # | รายการ | สถานะ |
|---|---|---|
| 1.1 | แอปใช้เฉพาะ `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ◐ |
| 1.2 | ไม่มี `service_role` key หรือ AI API key ในโค้ดแอป/ใน `EXPO_PUBLIC_*` (มี test ตรวจ) | ◐ |
| 1.3 | AI keys เก็บใน `supabase secrets` เท่านั้น | ☐ |
| 1.4 | `.env` ถูก gitignore, มี `.env.example` ที่ไม่มีค่าจริง | ◐ |
| 1.5 | ตั้ง spend limit ที่ dashboard ของผู้ให้บริการ AI | ☐ |
| 1.6 | หมุนเวียน key เมื่อสงสัยว่ารั่ว (เอกสารขั้นตอน) | ☐ |

## 2. Authentication & Session
| # | รายการ | สถานะ |
|---|---|---|
| 2.1 | Session เก็บใน SecureStore (Keychain/Keystore) | ◐ |
| 2.2 | เปิด email confirmation ใน Supabase Auth | ☐ |
| 2.3 | รหัสผ่านขั้นต่ำ 8 ตัว (ตั้งใน Auth settings + validate ฝั่งแอป) | ◐ |
| 2.4 | Rate limit การ login/OTP (Supabase Auth rate limits) | ☐ |
| 2.5 | ใช้ custom SMTP ก่อน production (built-in SMTP จำกัดมาก) | ☐ |
| 2.6 | ทุก Edge Function ตรวจ JWT ด้วย `auth.getUser()` | ◐ |

## 3. Authorization & RLS
| # | รายการ | สถานะ |
|---|---|---|
| 3.1 | เปิด RLS ทุกตารางใน `public` (มี test ตรวจว่าไม่มีตารางที่ปิด RLS) | ◐ |
| 3.2 | ผู้ใช้เข้าถึงเฉพาะข้อมูลตัวเอง (test ด้วย 2 users) | ◐ |
| 3.3 | Food database แก้ไขไม่ได้จาก client | ◐ |
| 3.4 | `subscriptions`, `ai_messages`, `ai_usage_daily` เขียนได้เฉพาะ service role | ◐ |
| 3.5 | Snapshot โภชนาการคำนวณใน DB (trigger/RPC) | ◐ |
| 3.6 | ฟังก์ชัน `security definer` ตั้ง `search_path` และ revoke จาก public | ◐ |

## 4. Input Validation
| # | รายการ | สถานะ |
|---|---|---|
| 4.1 | Zod validate ทุก request body ใน Edge Functions | ◐ |
| 4.2 | Check constraints ใน DB เป็นด่านสุดท้าย | ◐ |
| 4.3 | ไม่มี string concatenation ใน SQL (ใช้ supabase-js / parameterized RPC) | ◐ |
| 4.4 | จำกัดขนาด request body และความยาวข้อความ | ◐ |

## 5. AI Safety
| # | รายการ | สถานะ |
|---|---|---|
| 5.1 | เรียก AI จาก server เท่านั้น | ◐ |
| 5.2 | Structured output + Zod validate + ตรวจ food_id อยู่ใน candidate set | ◐ |
| 5.3 | ตัวเลขโภชนาการไม่มาจาก AI | ◐ |
| 5.4 | Prompt injection: แยกข้อมูลผู้ใช้ใน tag, ไม่ให้ผู้ใช้เขียน assistant message, ไม่รับ free-text preferences | ◐ |
| 5.5 | Health guardrails ใน system prompt + disclaimer ใน UI | ◐ |
| 5.6 | Timeout + retry จำกัด + fallback แบบไม่ใช้ AI | ◐ |
| 5.7 | Quota ต่อผู้ใช้ต่อวัน + บันทึก token/cost | ◐ |
| 5.8 | ไม่ส่งชื่อ/อีเมล/ข้อมูลระบุตัวตนให้ AI provider | ◐ |
| 5.9 | ตรวจ data retention policy ของ AI provider และระบุใน Privacy Policy | ☐ |

## 6. Privacy / PDPA readiness
| # | รายการ | สถานะ |
|---|---|---|
| 6.1 | ขอ consent แยกประเภท (privacy, health_data, ai_personalization, analytics) | ◐ |
| 6.2 | บันทึก consent แบบ append-only พร้อม policy_version | ◐ |
| 6.3 | ไม่บังคับข้อมูลที่ไม่จำเป็น (เพศ/น้ำหนัก ข้ามได้) | ◐ |
| 6.4 | ถอน consent ได้จากหน้า Settings | ☐ |
| 6.5 | ลบบัญชี + ข้อมูลทั้งหมดได้ในแอป (store requirement ด้วย) | ◐ |
| 6.6 | Export ข้อมูลของตัวเอง (สิทธิ์ขอรับข้อมูล) | ☐ (Phase 2) |
| 6.7 | Privacy Policy + Terms ภาษาไทย ตรวจโดยนักกฎหมาย | ☐ |
| 6.8 | Logs ไม่มีข้อมูลสุขภาพ/ข้อความแชท/อีเมล (log แค่ user id แบบ hash + error code) | ◐ |
| 6.9 | Analytics ภายใน ไม่มีข้อมูลสุขภาพ | ◐ |
| 6.10 | ภูมิภาค Supabase (แนะนำ ap-southeast-1 Singapore) + ระบุการโอนข้อมูลข้ามประเทศใน Privacy Policy | ☐ |
| 6.11 | กำหนดระยะเวลาเก็บข้อมูล (เช่น ลบ ai_messages > 180 วัน) | ☐ |

## 7. Transport & Platform
| # | รายการ | สถานะ |
|---|---|---|
| 7.1 | HTTPS ทุกการเชื่อมต่อ (Supabase บังคับ) | ☑ |
| 7.2 | ไม่ใช้ `http://` ใน config | ◐ |
| 7.3 | `npm audit` ใน CI + Dependabot | ☐ |
| 7.4 | EAS secrets สำหรับ build env | ☐ |
| 7.5 | Backup DB (Supabase Pro: daily backups) | ☐ |

## 8. ก่อน Launch (Gate)
- [ ] Pen-test เบื้องต้นของ RLS ด้วย anon key บน staging
- [ ] ตรวจทุกข้อในหมวด 1, 3, 5, 6 เป็น ☑
- [ ] ข้อมูลอาหารที่ใช้แนะนำผ่านการตรวจสอบ (`verified`) ≥ 40 รายการ ครอบคลุมทุกมื้อ
- [ ] Review App Store Guideline 5.1 (Privacy) + 1.4.1 (Health) + 3.1 (IAP), Google Play Health apps policy + Data safety form
