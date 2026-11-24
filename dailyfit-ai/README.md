# DailyFit AI

> ผู้ช่วย AI ด้านอาหารและไลฟ์สไตล์สำหรับคนทำงานออฟฟิศในประเทศไทย
> "ช่วยให้คนไทยกินดีขึ้นและใช้ชีวิตดีขึ้น โดยไม่ต้องเสียเวลาวางแผนเอง"

ชื่อ DailyFit AI เป็นชื่อชั่วคราว

## สถานะ
**Phase 0 — Foundation** (ดู [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md))
ยังไม่พร้อมให้ผู้ใช้จริง: ยังไม่ได้เชื่อม Supabase project จริง และยังไม่มีข้อมูลโภชนาการที่ผ่านการตรวจสอบ

## Tech stack
- **App:** Expo SDK 58, React Native 0.88, TypeScript (strict), Expo Router, React Query
- **Backend:** Supabase (PostgreSQL + RLS, Auth, Edge Functions/Deno, Storage)
- **AI:** Anthropic Claude (ค่าเริ่มต้น) หรือ OpenAI ผ่าน provider abstraction — เรียกจาก server เท่านั้น

## Quick start
```bash
cd dailyfit-ai
npm install
cp .env.example .env          # ใส่ EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run typecheck && npm run lint && npm test
npx expo start                # เปิดด้วย Expo Go หรือ development build
```

### Backend (local)
```bash
npx supabase start            # ต้องมี Docker
npx supabase db reset         # รัน migrations + seed.sql (ข้อมูลตัวอย่าง)
npx supabase functions serve --env-file supabase/.env.local
```
ทดสอบ schema/RLS โดยไม่ใช้ Docker: `npm run test:db` (ต้องมี PostgreSQL ในเครื่อง)

## โครงสร้างโปรเจกต์
```
src/app/            routes (Expo Router)
src/components/     UI components (ui/ = design system)
src/hooks/          React Query hooks
src/services/       data access (Supabase / Edge Functions)
src/domain/         pure business logic
src/lib/            client setup (supabase, query client, env)
src/constants/      theme tokens
src/types/          shared types
supabase/migrations SQL migrations
supabase/functions  Edge Functions (Deno) + _shared
supabase/tests      SQL tests (RLS/constraints)
tests/              Vitest unit tests
docs/               เอกสาร
```

## เอกสาร
| เอกสาร | เนื้อหา |
|---|---|
| [CLAUDE.md](CLAUDE.md) | กฎการพัฒนาสำหรับ Claude Code / ทีม |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | สถาปัตยกรรมระบบ |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, RLS, data pipeline |
| [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | แผนการพัฒนา |
| [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) | ความปลอดภัย/PDPA |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Edge Function API |
| [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) | การตั้งค่าและขั้นตอนพัฒนา |

## บริการภายนอกและค่าใช้จ่ายโดยประมาณ (3 เดือนแรก)
| บริการ | ช่วง Dev | ก่อน/หลัง Launch | หมายเหตุ |
|---|---|---|---|
| Supabase | Free ($0) | Pro ~$25/เดือน | Free จะ pause เมื่อไม่ใช้งาน 7 วัน, ไม่มี backup |
| Expo / EAS | Free tier ($0) | $0–19/เดือน | Free มีโควตา build จำกัดต่อเดือน |
| Apple Developer | – | $99/ปี | จำเป็นสำหรับ TestFlight/App Store |
| Google Play Console | – | $25 ครั้งเดียว | |
| Custom SMTP (เช่น Resend) | Free tier | $0–20/เดือน | สำหรับอีเมลยืนยัน/รีเซ็ตรหัส |
| LLM API | ดูด้านล่าง | ดูด้านล่าง | ต้องตั้ง spend limit |

**ต้นทุน AI (ประมาณการ, ราคา ณ 2026-11):**
| Model | ราคา (in/out ต่อ 1M tokens) | ~ต่อการสร้างแผน 1 ครั้ง | ~ต่อข้อความ Coach |
|---|---|---|---|
| Claude Opus 5.5 (`claude-opus-5-5`) | $4 / $20 | ~$0.022 | ~$0.014 |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 / $0.50 | ~$0.0006 | ~$0.0004 |

สมมติฐาน: แผน ~2.5k input + ~0.6k output tokens; Coach ~1.5k + ~0.4k tokens
ตัวอย่าง 300 ผู้ใช้ active × (1 แผน + 3 ข้อความ)/วัน × 30 วัน: Opus 5.5 ≈ $580/เดือน · Haiku 5.5 ≈ $15/เดือน (ยังไม่รวม thinking tokens ที่อาจเพิ่ม)
→ Model ตั้งค่าได้ผ่าน `AI_MODEL_PLANNER` / `AI_MODEL_COACH` — **เจ้าของโปรเจกต์ต้องเลือก** ก่อน deploy (ดูคำถามค้างใน Roadmap)

ไม่มีการสมัครบริการแบบเสียเงินใด ๆ จนกว่าเจ้าของโปรเจกต์อนุมัติ

## ข้อจำกัดความรับผิดชอบ
DailyFit AI ให้ข้อมูลทั่วไปเพื่อการใช้ชีวิต ไม่ใช่การวินิจฉัยหรือรักษาโรค และไม่ทดแทนแพทย์หรือนักกำหนดอาหาร ตัวเลขโภชนาการและราคาเป็นค่าประมาณ
