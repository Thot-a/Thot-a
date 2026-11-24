/** Local calendar date in Asia/Bangkok as YYYY-MM-DD (the app's planning day). */
export function bangkokToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** e.g. "วันอังคารที่ 24 พ.ย. 2569" (Buddhist era, as Thai users expect). */
export function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `วัน${TH_DAYS[dow]}ที่ ${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

export function greetingFor(now: Date = new Date()): string {
  const h = (now.getUTCHours() + 7) % 24;
  if (h < 11) return 'อรุณสวัสดิ์';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}
