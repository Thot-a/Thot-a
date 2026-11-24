/**
 * Normalised error type for the app. Screens show `message` (Thai, user-friendly);
 * `code` is for logic/analytics. Never surface raw server messages to users.
 */
export type AppErrorCode =
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_FOOD_DATA'
  | 'AI_UNAVAILABLE'
  | 'UNKNOWN';

const MESSAGES: Record<AppErrorCode, string> = {
  NETWORK: 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองตรวจสอบสัญญาณแล้วลองใหม่อีกครั้ง',
  NOT_CONFIGURED: 'แอปยังไม่ได้ตั้งค่าการเชื่อมต่อเซิร์ฟเวอร์',
  UNAUTHENTICATED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  EMAIL_NOT_CONFIRMED: 'กรุณายืนยันอีเมลจากลิงก์ที่เราส่งไปก่อนเข้าสู่ระบบ',
  EMAIL_TAKEN: 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน',
  WEAK_PASSWORD: 'รหัสผ่านยังไม่ปลอดภัยพอ ลองใช้อย่างน้อย 8 ตัวอักษรผสมตัวเลข',
  RATE_LIMITED: 'มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  QUOTA_EXCEEDED: 'วันนี้ใช้สิทธิ์ครบแล้ว พรุ่งนี้ใช้ได้อีกครั้ง',
  VALIDATION: 'ข้อมูลบางอย่างไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  PERMISSION: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  INSUFFICIENT_FOOD_DATA: 'ข้อมูลเมนูที่ตรวจสอบแล้วยังไม่พอสำหรับเงื่อนไขของคุณ เราจะไม่เดาข้อมูลขึ้นมาเอง',
  AI_UNAVAILABLE: 'ผู้ช่วย AI ไม่ว่างชั่วคราว กรุณาลองใหม่อีกครั้ง',
  UNKNOWN: 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง',
};

const RETRYABLE: ReadonlySet<AppErrorCode> = new Set(['NETWORK', 'AI_UNAVAILABLE', 'UNKNOWN']);

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  constructor(code: AppErrorCode, message?: string) {
    super(message ?? MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.retryable = RETRYABLE.has(code);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

type ErrorLike = { code?: unknown; status?: unknown; message?: unknown; name?: unknown };

/** Map Supabase Auth / PostgREST / fetch errors to AppError. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  const err = (typeof e === 'object' && e !== null ? e : {}) as ErrorLike;
  const code = typeof err.code === 'string' ? err.code : '';
  const status = typeof err.status === 'number' ? err.status : 0;
  const message = typeof err.message === 'string' ? err.message : '';

  if (message === 'SUPABASE_NOT_CONFIGURED') return new AppError('NOT_CONFIGURED');
  if (err.name === 'AuthRetryableFetchError' || /network request failed|failed to fetch/i.test(message)) {
    return new AppError('NETWORK');
  }
  switch (code) {
    case 'invalid_credentials':
      return new AppError('INVALID_CREDENTIALS');
    case 'email_not_confirmed':
      return new AppError('EMAIL_NOT_CONFIRMED');
    case 'user_already_exists':
    case 'email_exists':
      return new AppError('EMAIL_TAKEN');
    case 'weak_password':
      return new AppError('WEAK_PASSWORD');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new AppError('RATE_LIMITED');
    case '42501': // insufficient_privilege
      return new AppError('PERMISSION');
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
    case '23502':
      return new AppError('VALIDATION');
    case 'PGRST116':
      return new AppError('NOT_FOUND');
    case 'NOT_FOUND':
    case 'QUOTA_EXCEEDED':
    case 'INSUFFICIENT_FOOD_DATA':
    case 'AI_UNAVAILABLE':
    case 'VALIDATION':
    case 'UNAUTHENTICATED':
      return new AppError(code);
  }
  if (status === 401) return new AppError('UNAUTHENTICATED');
  if (status === 429) return new AppError('RATE_LIMITED');
  return new AppError('UNKNOWN');
}
