// DEMO MODE ONLY — placeholder nutrition values (same as supabase/seed.sql). NOT VERIFIED.
// Used only when EXPO_PUBLIC_DEMO_MODE=true; the UI shows a "โหมดตัวอย่าง" banner.
import type { DemoFood } from './types';

export const DEMO_FOODS: DemoFood[] = [
  {
    "id": "demo-khao-kaprao-gai",
    "slug": "khao-kaprao-gai",
    "name_th": "ข้าวกะเพราไก่",
    "name_en": "Stir-fried chicken with holy basil on rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "spicy",
      "rice",
      "street_food",
      "quick"
    ],
    "kcal": 550.0,
    "protein_g": 25.0,
    "carbs_g": 65.0,
    "fat_g": 20.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-kaprao-gai-khai-dao",
    "slug": "khao-kaprao-gai-khai-dao",
    "name_th": "ข้าวกะเพราไก่ไข่ดาว",
    "name_en": "Holy basil chicken on rice with fried egg",
    "category": "rice_dish",
    "serving_description_th": "1 จาน + ไข่ดาว 1 ฟอง",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "egg",
      "spicy",
      "fried",
      "rice",
      "street_food"
    ],
    "kcal": 640.0,
    "protein_g": 31.0,
    "carbs_g": 65.0,
    "fat_g": 27.0,
    "price_min_thb": 60,
    "price_max_thb": 80
  },
  {
    "id": "demo-khao-pad-gai",
    "slug": "khao-pad-gai",
    "name_th": "ข้าวผัดไก่",
    "name_en": "Chicken fried rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "egg",
      "rice",
      "street_food"
    ],
    "kcal": 580.0,
    "protein_g": 22.0,
    "carbs_g": 75.0,
    "fat_g": 20.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-man-gai",
    "slug": "khao-man-gai",
    "name_th": "ข้าวมันไก่",
    "name_en": "Hainanese chicken rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 300 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "rice",
      "street_food"
    ],
    "kcal": 600.0,
    "protein_g": 25.0,
    "carbs_g": 70.0,
    "fat_g": 23.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-man-gai-tom",
    "slug": "khao-man-gai-tom",
    "name_th": "ข้าวมันไก่ต้ม (ไม่หนัง)",
    "name_en": "Steamed chicken rice, skinless",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 300 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "rice",
      "low_fat",
      "street_food"
    ],
    "kcal": 480.0,
    "protein_g": 28.0,
    "carbs_g": 68.0,
    "fat_g": 10.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-khai-jiao",
    "slug": "khao-khai-jiao",
    "name_th": "ข้าวไข่เจียว",
    "name_en": "Thai omelette on rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ไข่ 2 ฟอง)",
    "meal_types": [
      "breakfast",
      "lunch",
      "dinner"
    ],
    "tags": [
      "egg",
      "fried",
      "rice",
      "quick",
      "home_cooked"
    ],
    "kcal": 450.0,
    "protein_g": 14.0,
    "carbs_g": 45.0,
    "fat_g": 24.0,
    "price_min_thb": 30,
    "price_max_thb": 50
  },
  {
    "id": "demo-khao-moo-daeng",
    "slug": "khao-moo-daeng",
    "name_th": "ข้าวหมูแดง",
    "name_en": "Red BBQ pork on rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 300 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "rice",
      "street_food"
    ],
    "kcal": 540.0,
    "protein_g": 24.0,
    "carbs_g": 75.0,
    "fat_g": 15.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-pad-krapao-moo-sap",
    "slug": "khao-pad-krapao-moo-sap",
    "name_th": "ข้าวกะเพราหมูสับ",
    "name_en": "Holy basil minced pork on rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "spicy",
      "rice",
      "street_food",
      "quick"
    ],
    "kcal": 580.0,
    "protein_g": 23.0,
    "carbs_g": 65.0,
    "fat_g": 25.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-na-gai",
    "slug": "khao-na-gai",
    "name_th": "ข้าวหน้าไก่",
    "name_en": "Chicken in gravy on rice",
    "category": "rice_dish",
    "serving_description_th": "1 จาน (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "rice",
      "street_food"
    ],
    "kcal": 520.0,
    "protein_g": 22.0,
    "carbs_g": 75.0,
    "fat_g": 14.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-tom-gai",
    "slug": "khao-tom-gai",
    "name_th": "ข้าวต้มไก่",
    "name_en": "Chicken rice soup",
    "category": "soup",
    "serving_description_th": "1 ชาม (ประมาณ 400 กรัม)",
    "meal_types": [
      "breakfast",
      "dinner"
    ],
    "tags": [
      "chicken",
      "soup",
      "rice",
      "low_fat"
    ],
    "kcal": 280.0,
    "protein_g": 18.0,
    "carbs_g": 40.0,
    "fat_g": 5.0,
    "price_min_thb": 40,
    "price_max_thb": 60
  },
  {
    "id": "demo-khao-tom-moo",
    "slug": "khao-tom-moo",
    "name_th": "ข้าวต้มหมู",
    "name_en": "Pork rice soup",
    "category": "soup",
    "serving_description_th": "1 ชาม (ประมาณ 400 กรัม)",
    "meal_types": [
      "breakfast",
      "dinner"
    ],
    "tags": [
      "pork",
      "soup",
      "rice"
    ],
    "kcal": 300.0,
    "protein_g": 16.0,
    "carbs_g": 40.0,
    "fat_g": 8.0,
    "price_min_thb": 40,
    "price_max_thb": 60
  },
  {
    "id": "demo-jok-moo",
    "slug": "jok-moo",
    "name_th": "โจ๊กหมู",
    "name_en": "Pork congee",
    "category": "breakfast",
    "serving_description_th": "1 ถ้วย (ประมาณ 350 กรัม)",
    "meal_types": [
      "breakfast"
    ],
    "tags": [
      "pork",
      "egg",
      "soup",
      "rice",
      "quick"
    ],
    "kcal": 270.0,
    "protein_g": 14.0,
    "carbs_g": 38.0,
    "fat_g": 7.0,
    "price_min_thb": 35,
    "price_max_thb": 55
  },
  {
    "id": "demo-kuay-tiew-nam-gai",
    "slug": "kuay-tiew-nam-gai",
    "name_th": "ก๋วยเตี๋ยวน้ำใสไก่",
    "name_en": "Clear chicken noodle soup",
    "category": "noodle",
    "serving_description_th": "1 ชาม (ประมาณ 400 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "noodle",
      "soup",
      "street_food"
    ],
    "kcal": 330.0,
    "protein_g": 20.0,
    "carbs_g": 45.0,
    "fat_g": 8.0,
    "price_min_thb": 45,
    "price_max_thb": 60
  },
  {
    "id": "demo-kuay-tiew-nam-moo",
    "slug": "kuay-tiew-nam-moo",
    "name_th": "ก๋วยเตี๋ยวน้ำใสหมู",
    "name_en": "Clear pork noodle soup",
    "category": "noodle",
    "serving_description_th": "1 ชาม (ประมาณ 400 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "noodle",
      "soup",
      "street_food"
    ],
    "kcal": 350.0,
    "protein_g": 18.0,
    "carbs_g": 45.0,
    "fat_g": 10.0,
    "price_min_thb": 45,
    "price_max_thb": 60
  },
  {
    "id": "demo-kuay-tiew-tom-yum",
    "slug": "kuay-tiew-tom-yum",
    "name_th": "ก๋วยเตี๋ยวต้มยำ",
    "name_en": "Tom yum noodle soup",
    "category": "noodle",
    "serving_description_th": "1 ชาม (ประมาณ 400 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "peanut",
      "spicy",
      "noodle",
      "soup",
      "street_food"
    ],
    "kcal": 420.0,
    "protein_g": 20.0,
    "carbs_g": 50.0,
    "fat_g": 15.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-suki-nam-gai",
    "slug": "suki-nam-gai",
    "name_th": "สุกี้น้ำไก่",
    "name_en": "Thai suki soup with chicken",
    "category": "noodle",
    "serving_description_th": "1 ชาม (ประมาณ 450 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "egg",
      "noodle",
      "soup",
      "street_food"
    ],
    "kcal": 330.0,
    "protein_g": 24.0,
    "carbs_g": 40.0,
    "fat_g": 8.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-suki-nam-talay",
    "slug": "suki-nam-talay",
    "name_th": "สุกี้น้ำทะเล",
    "name_en": "Thai suki soup with seafood",
    "category": "noodle",
    "serving_description_th": "1 ชาม (ประมาณ 450 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "seafood",
      "shrimp",
      "egg",
      "noodle",
      "soup"
    ],
    "kcal": 320.0,
    "protein_g": 24.0,
    "carbs_g": 40.0,
    "fat_g": 6.0,
    "price_min_thb": 60,
    "price_max_thb": 90
  },
  {
    "id": "demo-pad-thai-goong",
    "slug": "pad-thai-goong",
    "name_th": "ผัดไทยกุ้ง",
    "name_en": "Pad thai with shrimp",
    "category": "noodle",
    "serving_description_th": "1 จาน (ประมาณ 300 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "shrimp",
      "seafood",
      "egg",
      "peanut",
      "noodle",
      "street_food"
    ],
    "kcal": 550.0,
    "protein_g": 18.0,
    "carbs_g": 70.0,
    "fat_g": 22.0,
    "price_min_thb": 60,
    "price_max_thb": 90
  },
  {
    "id": "demo-pad-see-ew-moo",
    "slug": "pad-see-ew-moo",
    "name_th": "ผัดซีอิ๊วหมู",
    "name_en": "Stir-fried noodles with soy sauce and pork",
    "category": "noodle",
    "serving_description_th": "1 จาน (ประมาณ 300 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "egg",
      "noodle",
      "street_food"
    ],
    "kcal": 600.0,
    "protein_g": 20.0,
    "carbs_g": 75.0,
    "fat_g": 24.0,
    "price_min_thb": 50,
    "price_max_thb": 70
  },
  {
    "id": "demo-tom-yum-goong",
    "slug": "tom-yum-goong",
    "name_th": "ต้มยำกุ้ง (น้ำใส)",
    "name_en": "Clear tom yum soup with shrimp",
    "category": "soup",
    "serving_description_th": "1 ถ้วย (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "shrimp",
      "seafood",
      "spicy",
      "soup"
    ],
    "kcal": 180.0,
    "protein_g": 18.0,
    "carbs_g": 10.0,
    "fat_g": 7.0,
    "price_min_thb": 80,
    "price_max_thb": 150
  },
  {
    "id": "demo-gaeng-jued-tao-hoo",
    "slug": "gaeng-jued-tao-hoo",
    "name_th": "แกงจืดเต้าหู้หมูสับ",
    "name_en": "Clear soup with tofu and minced pork",
    "category": "soup",
    "serving_description_th": "1 ถ้วย (ประมาณ 350 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "tofu",
      "soup",
      "low_fat",
      "home_cooked"
    ],
    "kcal": 160.0,
    "protein_g": 14.0,
    "carbs_g": 8.0,
    "fat_g": 8.0,
    "price_min_thb": 40,
    "price_max_thb": 70
  },
  {
    "id": "demo-gaeng-keaw-wan-gai",
    "slug": "gaeng-keaw-wan-gai",
    "name_th": "แกงเขียวหวานไก่",
    "name_en": "Green curry with chicken",
    "category": "curry",
    "serving_description_th": "1 ถ้วย (ประมาณ 250 กรัม) ไม่รวมข้าว",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "spicy",
      "dairy"
    ],
    "kcal": 300.0,
    "protein_g": 18.0,
    "carbs_g": 10.0,
    "fat_g": 21.0,
    "price_min_thb": 40,
    "price_max_thb": 70
  },
  {
    "id": "demo-khao-suay",
    "slug": "khao-suay",
    "name_th": "ข้าวสวย",
    "name_en": "Steamed jasmine rice",
    "category": "side_dish",
    "serving_description_th": "1 ทัพพีใหญ่ (ประมาณ 150 กรัม)",
    "meal_types": [
      "breakfast",
      "lunch",
      "dinner"
    ],
    "tags": [
      "rice",
      "vegan",
      "vegetarian"
    ],
    "kcal": 200.0,
    "protein_g": 4.0,
    "carbs_g": 44.0,
    "fat_g": 0.5,
    "price_min_thb": 10,
    "price_max_thb": 15
  },
  {
    "id": "demo-khai-tom",
    "slug": "khai-tom",
    "name_th": "ไข่ต้ม",
    "name_en": "Boiled egg",
    "category": "protein",
    "serving_description_th": "1 ฟอง (ประมาณ 50 กรัม)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "egg",
      "high_protein",
      "vegetarian",
      "quick",
      "convenience_store"
    ],
    "kcal": 75.0,
    "protein_g": 6.5,
    "carbs_g": 0.5,
    "fat_g": 5.0,
    "price_min_thb": 8,
    "price_max_thb": 15
  },
  {
    "id": "demo-ok-gai-yang",
    "slug": "ok-gai-yang",
    "name_th": "อกไก่ย่าง",
    "name_en": "Grilled chicken breast",
    "category": "protein",
    "serving_description_th": "1 ชิ้น (ประมาณ 100 กรัม)",
    "meal_types": [
      "lunch",
      "dinner",
      "snack"
    ],
    "tags": [
      "chicken",
      "high_protein",
      "low_fat",
      "convenience_store"
    ],
    "kcal": 165.0,
    "protein_g": 31.0,
    "carbs_g": 0.0,
    "fat_g": 4.0,
    "price_min_thb": 35,
    "price_max_thb": 60
  },
  {
    "id": "demo-ok-gai-sous-vide",
    "slug": "ok-gai-sous-vide",
    "name_th": "อกไก่นุ่มพร้อมทาน",
    "name_en": "Ready-to-eat chicken breast",
    "category": "protein",
    "serving_description_th": "1 ซอง (ประมาณ 100 กรัม)",
    "meal_types": [
      "breakfast",
      "lunch",
      "snack"
    ],
    "tags": [
      "chicken",
      "high_protein",
      "low_fat",
      "convenience_store",
      "quick"
    ],
    "kcal": 120.0,
    "protein_g": 24.0,
    "carbs_g": 2.0,
    "fat_g": 2.0,
    "price_min_thb": 35,
    "price_max_thb": 50
  },
  {
    "id": "demo-salad-ok-gai",
    "slug": "salad-ok-gai",
    "name_th": "สลัดอกไก่",
    "name_en": "Chicken breast salad",
    "category": "salad",
    "serving_description_th": "1 กล่อง (ประมาณ 250 กรัม) รวมน้ำสลัดใส",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "chicken",
      "high_protein",
      "low_fat",
      "convenience_store"
    ],
    "kcal": 250.0,
    "protein_g": 28.0,
    "carbs_g": 12.0,
    "fat_g": 9.0,
    "price_min_thb": 60,
    "price_max_thb": 100
  },
  {
    "id": "demo-som-tam-thai",
    "slug": "som-tam-thai",
    "name_th": "ส้มตำไทย",
    "name_en": "Green papaya salad (Thai style)",
    "category": "salad",
    "serving_description_th": "1 จาน (ประมาณ 200 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "peanut",
      "shrimp",
      "spicy",
      "street_food"
    ],
    "kcal": 150.0,
    "protein_g": 5.0,
    "carbs_g": 25.0,
    "fat_g": 4.0,
    "price_min_thb": 40,
    "price_max_thb": 60
  },
  {
    "id": "demo-yum-woon-sen",
    "slug": "yum-woon-sen",
    "name_th": "ยำวุ้นเส้น",
    "name_en": "Glass noodle salad",
    "category": "salad",
    "serving_description_th": "1 จาน (ประมาณ 250 กรัม)",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "pork",
      "shrimp",
      "seafood",
      "spicy",
      "noodle"
    ],
    "kcal": 260.0,
    "protein_g": 16.0,
    "carbs_g": 30.0,
    "fat_g": 8.0,
    "price_min_thb": 50,
    "price_max_thb": 80
  },
  {
    "id": "demo-khao-niao-gai-yang",
    "slug": "khao-niao-gai-yang",
    "name_th": "ข้าวเหนียวไก่ย่าง",
    "name_en": "Sticky rice with grilled chicken",
    "category": "rice_dish",
    "serving_description_th": "ข้าวเหนียว 1 ห่อ + ไก่ย่าง 1 ไม้",
    "meal_types": [
      "breakfast",
      "lunch"
    ],
    "tags": [
      "chicken",
      "rice",
      "street_food",
      "quick"
    ],
    "kcal": 480.0,
    "protein_g": 25.0,
    "carbs_g": 60.0,
    "fat_g": 14.0,
    "price_min_thb": 40,
    "price_max_thb": 60
  },
  {
    "id": "demo-sandwich-tuna",
    "slug": "sandwich-tuna",
    "name_th": "แซนด์วิชทูน่า",
    "name_en": "Tuna sandwich",
    "category": "breakfast",
    "serving_description_th": "1 ชิ้น (ประมาณ 120 กรัม)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "fish",
      "seafood",
      "egg",
      "quick",
      "convenience_store"
    ],
    "kcal": 280.0,
    "protein_g": 14.0,
    "carbs_g": 30.0,
    "fat_g": 11.0,
    "price_min_thb": 30,
    "price_max_thb": 45
  },
  {
    "id": "demo-nom-jued-pasteurized",
    "slug": "nom-jued-pasteurized",
    "name_th": "นมจืดพาสเจอร์ไรส์",
    "name_en": "Plain pasteurised milk",
    "category": "drink",
    "serving_description_th": "1 กล่อง (200 มล.)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "dairy",
      "vegetarian",
      "quick",
      "convenience_store"
    ],
    "kcal": 130.0,
    "protein_g": 6.5,
    "carbs_g": 9.5,
    "fat_g": 7.5,
    "price_min_thb": 12,
    "price_max_thb": 18
  },
  {
    "id": "demo-nom-thua-leuang",
    "slug": "nom-thua-leuang",
    "name_th": "นมถั่วเหลือง (หวานน้อย)",
    "name_en": "Soy milk, low sugar",
    "category": "drink",
    "serving_description_th": "1 กล่อง (250 มล.)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "vegan",
      "vegetarian",
      "quick",
      "convenience_store"
    ],
    "kcal": 120.0,
    "protein_g": 7.0,
    "carbs_g": 12.0,
    "fat_g": 5.0,
    "price_min_thb": 12,
    "price_max_thb": 20
  },
  {
    "id": "demo-yogurt-plain",
    "slug": "yogurt-plain",
    "name_th": "โยเกิร์ตรสธรรมชาติ",
    "name_en": "Plain yogurt",
    "category": "snack",
    "serving_description_th": "1 ถ้วย (ประมาณ 135 กรัม)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "dairy",
      "vegetarian",
      "quick",
      "convenience_store"
    ],
    "kcal": 100.0,
    "protein_g": 5.0,
    "carbs_g": 9.0,
    "fat_g": 4.5,
    "price_min_thb": 15,
    "price_max_thb": 25
  },
  {
    "id": "demo-kluay-hom",
    "slug": "kluay-hom",
    "name_th": "กล้วยหอม",
    "name_en": "Banana (Cavendish)",
    "category": "fruit",
    "serving_description_th": "1 ผล (ประมาณ 120 กรัม)",
    "meal_types": [
      "breakfast",
      "snack"
    ],
    "tags": [
      "vegan",
      "vegetarian",
      "quick",
      "convenience_store"
    ],
    "kcal": 110.0,
    "protein_g": 1.3,
    "carbs_g": 27.0,
    "fat_g": 0.4,
    "price_min_thb": 10,
    "price_max_thb": 20
  },
  {
    "id": "demo-pla-nueng-manao",
    "slug": "pla-nueng-manao",
    "name_th": "ปลากะพงนึ่งมะนาว (ส่วนบุคคล)",
    "name_en": "Steamed sea bass with lime (single portion)",
    "category": "protein",
    "serving_description_th": "1 ที่ (ประมาณ 200 กรัม)",
    "meal_types": [
      "dinner"
    ],
    "tags": [
      "fish",
      "seafood",
      "spicy",
      "high_protein",
      "low_fat"
    ],
    "kcal": 230.0,
    "protein_g": 38.0,
    "carbs_g": 8.0,
    "fat_g": 5.0,
    "price_min_thb": 120,
    "price_max_thb": 250
  },
  {
    "id": "demo-pad-pak-ruam",
    "slug": "pad-pak-ruam",
    "name_th": "ผัดผักรวม",
    "name_en": "Stir-fried mixed vegetables",
    "category": "side_dish",
    "serving_description_th": "1 จาน (ประมาณ 200 กรัม) ไม่รวมข้าว",
    "meal_types": [
      "lunch",
      "dinner"
    ],
    "tags": [
      "vegetarian",
      "home_cooked"
    ],
    "kcal": 180.0,
    "protein_g": 5.0,
    "carbs_g": 14.0,
    "fat_g": 12.0,
    "price_min_thb": 40,
    "price_max_thb": 60
  }
];
