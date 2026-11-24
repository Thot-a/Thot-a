/**
 * Demo mode: the whole app runs on in-memory sample data, with no backend.
 * For design review / shareable previews only. Enabled with EXPO_PUBLIC_DEMO_MODE=true.
 * Every screen shows a "โหมดตัวอย่าง" banner while this is on.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
