import type { FoodItem } from '@/types/models';

export type DemoFood = Omit<FoodItem, 'image_path' | 'verification_status'> & { slug: string };
