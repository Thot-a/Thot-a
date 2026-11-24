import type { MealType } from '@shared/constants';

export interface FoodItem {
  id: string;
  name_th: string;
  name_en: string | null;
  category: string;
  serving_description_th: string;
  meal_types: MealType[];
  tags: string[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  price_min_thb: number;
  price_max_thb: number;
  image_path: string | null;
  verification_status: 'verified' | 'sample';
}

export interface FoodLog {
  id: string;
  log_date: string;
  meal_type: MealType;
  serving_count: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_plan_item_id: string | null;
  created_at: string;
  food: Pick<FoodItem, 'id' | 'name_th' | 'category' | 'image_path' | 'serving_description_th' | 'price_min_thb' | 'price_max_thb'>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UserSummary {
  id: string;
  email: string | null;
}
