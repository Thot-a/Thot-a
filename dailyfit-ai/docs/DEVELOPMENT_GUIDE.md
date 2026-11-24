# DailyFit AI — Development Guide

## 1. Prerequisites
| Tool | Version ที่ทดสอบ | หมายเหตุ |
|---|---|---|
| Node.js | 22.x | |
| npm | 10.x | ใช้ `package-lock.json` |
| Expo SDK | 58 | `npx expo …` (ไม่ต้องติดตั้ง global) |
| Deno | 2.x | `npx deno …` สำหรับ type-check/test Edge Functions |
| PostgreSQL | 15+ | สำหรับ `npm run test:db` (ไม่ต้องใช้ Docker) |
| Docker | ล่าสุด | เฉพาะเมื่อรัน Supabase ทั้งชุดในเครื่อง (`npx supabase start`) |

## 2. ตั้งค่าครั้งแรก
```bash
cd dailyfit-ai
npm install
cp .env.example .env                      # ใส่ค่าจาก Supabase Dashboard → Project Settings → API
cp supabase/.env.example supabase/.env.local
```

### สร้าง Supabase project (เจ้าของโปรเจกต์ทำ)
1. สร้าง project (แนะนำ region `ap-southeast-1` Singapore) — Free tier ได้ในช่วงพัฒนา
2. Auth → Providers → Email: เปิด "Confirm email", ตั้งความยาวรหัสผ่านขั้นต่ำ 8
3. `npx supabase login && npx supabase link --project-ref <ref>`
4. `npx supabase db push` (รัน migrations) — **ห้ามรัน `seed.sql` บน production**
5. ตั้ง secrets: `npx supabase secrets set ANTHROPIC_API_KEY=… AI_MODEL_PLANNER=… AI_MODEL_COACH=…`
6. Deploy: `npx supabase functions deploy meal-planner delete-account`

## 3. คำสั่งประจำวัน
```bash
npx expo start              # dev server (Expo Go / dev build)
npm run check               # typecheck + lint + unit tests (Vitest)
npm run test:db             # migrations + RLS/constraint tests บน Postgres ชั่วคราว
npm run check:functions     # deno check Edge Functions
npm run test:functions      # deno test (planner service ด้วย fake repo/AI)
```
ติดตั้งแพ็กเกจ: `npx expo install <pkg>` (ถ้า api.expo.dev ถูกบล็อก ใช้ `EXPO_OFFLINE=1 npx expo install <pkg>`)

## 4. โครงสร้างโค้ดและกฎการแยกชั้น
- `src/app/` route เท่านั้น — ห้าม import `@/lib/supabase` (มี test ตรวจ)
- `src/services/` เป็นที่เดียวที่เรียก Supabase/Edge Functions และแปลง error เป็น `AppError`
- `supabase/functions/_shared/domain/` = โค้ด **isomorphic** (ไม่มี Deno/Node API) ใช้ร่วมกันทั้งแอปและ server ผ่าน alias `@shared/*`
  - import ภายในโฟลเดอร์นี้ต้องมีนามสกุล `.ts` (Deno ต้องการ)
- ค่าคงที่ (tags, goals, enums) ต้องตรงกับ SQL — `tests/domain/constants.test.ts` ตรวจให้

## 5. การเพิ่ม Feature (checklist)
1. ถ้าแตะ DB: เพิ่ม migration ใหม่ (`supabase/migrations/<timestamp>_<name>.sql`) → เปิด RLS → เพิ่ม test ใน `supabase/tests/`
2. Contract ใหม่ → `contracts.ts` (Zod) → อัปเดต `docs/API_DOCUMENTATION.md`
3. Logic ล้วน → `domain/` + unit test
4. Service + hook + screen (loading / empty / error / success)
5. รัน `npm run check && npm run test:db && npm run test:functions`
6. ทดสอบบนเครื่องจริง/simulator ขนาดเล็ก (iPhone SE) และใหญ่
7. อัปเดต Roadmap/Checklist

## 6. ข้อมูลอาหาร
- Migration `…_food_catalog.sql` มีรายการเมนูแบบ `unverified` (ไม่มีตัวเลข) — ผู้ใช้มองไม่เห็น
- `supabase/seed.sql` ใส่ตัวเลข **placeholder** สถานะ `sample` สำหรับ local เท่านั้น และต้องตั้ง `ALLOW_SAMPLE_FOOD=true` ฝั่ง function จึงจะถูกใช้ — UI แสดงแบนเนอร์ "ข้อมูลตัวอย่าง"
- การนำเข้าข้อมูลจริง: ดู `docs/DATABASE.md` §7

## 7. โหมดตัวอย่าง (Demo mode) และลิงก์พรีวิว
ใช้ดูดีไซน์และทดลองกดทุกหน้าโดยไม่ต้องมี Supabase / AI / มือถือ
- เปิดด้วย `EXPO_PUBLIC_DEMO_MODE=true` → services ทุกตัวสลับไปใช้ `src/demo/` (ข้อมูลในหน่วยความจำ, ตัวเลขโภชนาการ placeholder ชุดเดียวกับ `seed.sql`)
- ใช้ logic จริงของ planner (`@shared/planner`) — ต่างกันแค่แหล่งข้อมูล
- ทุกหน้าแสดงป้าย "โหมดตัวอย่าง" และ AI Coach แจ้งว่าคำตอบเป็นข้อความสาธิต ไม่ใช่ AI จริง
- **ห้ามเปิด demo mode ใน build ที่ส่งสโตร์**

สร้างไฟล์ HTML เดียวสำหรับแชร์เป็นลิงก์:
```bash
EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform web --output-dir /tmp/web
node scripts/build-preview.mjs /tmp/web preview-dist/index.html
```
สคริปต์จะฝัง JS, ฟอนต์ และรูปทั้งหมดเป็น data URI (ไม่โหลดอะไรจากภายนอก) และรีเซ็ต path เป็น `/` ก่อนแอปเริ่ม เพื่อให้ทำงานได้เมื่อถูกโฮสต์ใน sub-path หรือ iframe
หมายเหตุ: `app.json` ปิด `asyncRoutes` ของ expo-router เพื่อให้ได้ bundle เดียว

## 8. ข้อจำกัดที่รู้แล้ว
- ยังไม่มี generated DB types (`supabase gen types typescript`) — ทำหลังเชื่อม project จริง
- Reset password: อีเมลรีเซ็ตส่งได้ แต่หน้าตั้งรหัสใหม่ผ่าน deep link (`dailyfit://`) ยังไม่ได้ทำ
- Font: import ทั้งแพ็กเกจ Noto Sans Thai (ทุกน้ำหนักถูก bundle) — ลดขนาดภายหลังได้
- Fallback planner (ไม่ใช้ AI) เลือก 1 เมนูต่อมื้อ ยังไม่จับคู่กับข้าว/เครื่องดื่ม เมื่องบตึงอาจได้มื้อที่เบา
- รูปอาหาร: ยังไม่มีรูปจริง แสดงภาพประกอบตามหมวด (`FoodImage`); รองรับรูปจาก Supabase Storage bucket `food-images` ผ่าน `food_items.image_path` แล้ว
