// DEMO MODE ONLY — rule-based canned replies that illustrate the AI Coach UX.
// These are NOT AI responses. The production coach runs server-side (ai-coach Edge Function).
import { LABELS_TH } from '@shared/constants';
import type { MealPlanDTO } from '@shared/contracts';
import { priceEstimate } from '@shared/planner';

import type { Profile } from '@/services/profile';
import type { FoodItem } from '@/types/models';

interface Ctx {
  profile: Profile;
  todayPlan: MealPlanDTO | null;
  foods: FoodItem[];
}

const MEDICAL = /(เบาหวาน|ความดัน|ไต|โรค|ยา|ตั้งครรภ์|ท้อง|แพ้|ผ่าตัด|หัวใจ)/;

export function coachReply(q: string, { profile, todayPlan, foods }: Ctx): string {
  const lower = q.toLowerCase();
  if (MEDICAL.test(q)) {
    return 'เรื่องนี้เกี่ยวกับสุขภาพเฉพาะบุคคล แนะนำให้ปรึกษาแพทย์หรือนักกำหนดอาหารโดยตรงนะครับ ผมช่วยแนะนำเมนูทั่วไปที่เบาท้องและหาซื้อง่ายได้ แต่ไม่สามารถให้คำแนะนำทางการแพทย์ได้';
  }
  if (/ถูก|ประหยัด|งบ|ราคา/.test(q)) {
    const cheap = [...foods].sort((a, b) => priceEstimate(a) - priceEstimate(b)).filter((f) => f.kcal >= 250).slice(0, 3);
    return `ถ้าอยากประหยัด ลองเมนูเหล่านี้ดูครับ:\n${cheap.map((f) => `• ${f.name_th} (ประมาณ ฿${f.price_min_thb}–${f.price_max_thb})`).join('\n')}\nงบของคุณคือ ฿${profile.dailyBudgetThb}/วัน เลือกเมนูน้ำหรือข้าวราดกับข้าวจะช่วยคุมงบได้ดีครับ`;
  }
  if (/30 นาที|เวลาน้อย|รีบ|เร็ว/.test(q)) {
    const quick = foods.filter((f) => f.tags.includes('quick') && f.meal_types.includes('lunch')).slice(0, 3);
    return `เวลาพักสั้น ๆ เลือกเมนูที่สั่งแล้วได้เร็วครับ:\n${quick.map((f) => `• ${f.name_th}`).join('\n')}\nหรือแวะร้านสะดวกซื้อ หยิบอกไก่พร้อมทาน + ข้าวสวย ก็อิ่มและเร็วครับ`;
  }
  if (/เปลี่ยน|กลางวัน/.test(q) && todayPlan) {
    const lunch = todayPlan.items.find((i) => i.meal_type === 'lunch');
    return lunch
      ? `มื้อกลางวันตอนนี้คือ "${lunch.food.name_th}" ถ้าอยากเปลี่ยน กดปุ่ม "เปลี่ยนเมนู" บนการ์ดมื้อกลางวันในหน้าวันนี้ได้เลย เลือกได้ว่าอยากได้แบบถูกกว่า เบากว่า หรือโปรตีนมากขึ้นครับ`
      : 'วันนี้แผนของคุณยังไม่มีมื้อกลางวันครับ ลองตั้งจำนวนมื้อเป็น 3 มื้อในหน้าจัดแผนอาหารดูนะครับ';
  }
  if (/กินอะไร|แนะนำ|เมนู/.test(q)) {
    if (todayPlan) {
      return `วันนี้คุณมีแผนแล้วครับ:\n${todayPlan.items.map((i) => `• ${LABELS_TH.meal[i.meal_type]}: ${i.food.name_th}`).join('\n')}\nรวมประมาณ ${Math.round(todayPlan.total_kcal)} kcal และ ฿${todayPlan.total_price_min_thb}–${todayPlan.total_price_max_thb} ถ้ามื้อไหนไม่ถูกใจ เปลี่ยนได้ครับ`;
    }
    return 'ยังไม่มีแผนวันนี้ครับ กด "จัดเมนูวันนี้" ที่หน้าแรก แล้วผมจะเลือกเมนูให้ตามเป้าหมายและงบของคุณครับ';
  }
  if (lower.includes('น้ำ') && /ดื่ม/.test(q)) {
    return 'ดื่มน้ำเปล่าให้สม่ำเสมอระหว่างวันเป็นนิสัยที่ดีครับ ลองวางขวดน้ำไว้บนโต๊ะทำงานจะช่วยให้จำได้ง่ายขึ้น';
  }
  return `เป้าหมายของคุณคือ "${LABELS_TH.goal[profile.goal]}" ผมช่วยได้เรื่องเลือกเมนู คุมงบ และปรับแผนอาหารประจำวันครับ ลองถามเช่น "มีเมนูราคาถูกกว่านี้ไหม" หรือ "พักกลางวันแค่ 30 นาที ควรกินอะไร"`;
}
