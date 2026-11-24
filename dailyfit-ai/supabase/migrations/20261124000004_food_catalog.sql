-- DailyFit AI — reference food catalogue (Phase 0)
--
-- IMPORTANT: These rows are a *backlog* of common Thai office-worker dishes.
-- They are inserted as `unverified` WITHOUT nutrition numbers on purpose:
-- we do not fabricate nutrition data. They are invisible to users (RLS) and
-- are never recommended until a reviewer fills in values from a cited source
-- and sets verification_status = 'verified' (see docs/DATABASE.md §7).
--
-- price_*_thb are rough Bangkok street/food-court estimates (editable, not guaranteed).

insert into public.food_sources (name, publisher, url, license_note, notes)
values (
  'Thai Food Composition Database (Thai FCD)',
  'Institute of Nutrition, Mahidol University (INMU)',
  null,
  'Licence/terms for commercial use must be confirmed before import.',
  'Primary candidate source for verified nutrition values. Fill url/accessed_at at import time.'
)
on conflict (name) do nothing;

insert into public.food_items
  (slug, name_th, name_en, category, serving_size, serving_unit, serving_description_th,
   price_min_thb, price_max_thb, meal_types, tags, verification_status)
values
  ('khao-kaprao-gai',        'ข้าวกะเพราไก่',            'Stir-fried chicken with holy basil on rice', 'rice_dish', 350, 'g', '1 จาน (ประมาณ 350 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,spicy,rice,street_food,quick}', 'unverified'),
  ('khao-kaprao-gai-khai-dao','ข้าวกะเพราไก่ไข่ดาว',     'Holy basil chicken on rice with fried egg', 'rice_dish', 400, 'g', '1 จาน + ไข่ดาว 1 ฟอง', 60, 80, '{lunch,dinner}', '{chicken,egg,spicy,fried,rice,street_food}', 'unverified'),
  ('khao-pad-gai',           'ข้าวผัดไก่',                'Chicken fried rice', 'rice_dish', 350, 'g', '1 จาน (ประมาณ 350 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,egg,rice,street_food}', 'unverified'),
  ('khao-man-gai',           'ข้าวมันไก่',                'Hainanese chicken rice', 'rice_dish', 300, 'g', '1 จาน (ประมาณ 300 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,rice,street_food}', 'unverified'),
  ('khao-man-gai-tom',       'ข้าวมันไก่ต้ม (ไม่หนัง)',   'Steamed chicken rice, skinless', 'rice_dish', 300, 'g', '1 จาน (ประมาณ 300 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,rice,low_fat,street_food}', 'unverified'),
  ('khao-khai-jiao',         'ข้าวไข่เจียว',              'Thai omelette on rice', 'rice_dish', 250, 'g', '1 จาน (ไข่ 2 ฟอง)', 30, 50, '{breakfast,lunch,dinner}', '{egg,fried,rice,quick,home_cooked}', 'unverified'),
  ('khao-moo-daeng',         'ข้าวหมูแดง',                'Red BBQ pork on rice', 'rice_dish', 300, 'g', '1 จาน (ประมาณ 300 กรัม)', 50, 70, '{lunch,dinner}', '{pork,rice,street_food}', 'unverified'),
  ('khao-pad-krapao-moo-sap','ข้าวกะเพราหมูสับ',          'Holy basil minced pork on rice', 'rice_dish', 350, 'g', '1 จาน (ประมาณ 350 กรัม)', 50, 70, '{lunch,dinner}', '{pork,spicy,rice,street_food,quick}', 'unverified'),
  ('khao-na-gai',            'ข้าวหน้าไก่',                'Chicken in gravy on rice', 'rice_dish', 350, 'g', '1 จาน (ประมาณ 350 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,rice,street_food}', 'unverified'),
  ('khao-tom-gai',           'ข้าวต้มไก่',                 'Chicken rice soup', 'soup', 400, 'g', '1 ชาม (ประมาณ 400 กรัม)', 40, 60, '{breakfast,dinner}', '{chicken,soup,rice,low_fat}', 'unverified'),
  ('khao-tom-moo',           'ข้าวต้มหมู',                 'Pork rice soup', 'soup', 400, 'g', '1 ชาม (ประมาณ 400 กรัม)', 40, 60, '{breakfast,dinner}', '{pork,soup,rice}', 'unverified'),
  ('jok-moo',                'โจ๊กหมู',                    'Pork congee', 'breakfast', 350, 'g', '1 ถ้วย (ประมาณ 350 กรัม)', 35, 55, '{breakfast}', '{pork,egg,soup,rice,quick}', 'unverified'),
  ('kuay-tiew-nam-gai',      'ก๋วยเตี๋ยวน้ำใสไก่',         'Clear chicken noodle soup', 'noodle', 400, 'g', '1 ชาม (ประมาณ 400 กรัม)', 45, 60, '{lunch,dinner}', '{chicken,noodle,soup,street_food}', 'unverified'),
  ('kuay-tiew-nam-moo',      'ก๋วยเตี๋ยวน้ำใสหมู',         'Clear pork noodle soup', 'noodle', 400, 'g', '1 ชาม (ประมาณ 400 กรัม)', 45, 60, '{lunch,dinner}', '{pork,noodle,soup,street_food}', 'unverified'),
  ('kuay-tiew-tom-yum',      'ก๋วยเตี๋ยวต้มยำ',            'Tom yum noodle soup', 'noodle', 400, 'g', '1 ชาม (ประมาณ 400 กรัม)', 50, 70, '{lunch,dinner}', '{pork,peanut,spicy,noodle,soup,street_food}', 'unverified'),
  ('suki-nam-gai',           'สุกี้น้ำไก่',                 'Thai suki soup with chicken', 'noodle', 450, 'g', '1 ชาม (ประมาณ 450 กรัม)', 50, 70, '{lunch,dinner}', '{chicken,egg,noodle,soup,street_food}', 'unverified'),
  ('suki-nam-talay',         'สุกี้น้ำทะเล',                'Thai suki soup with seafood', 'noodle', 450, 'g', '1 ชาม (ประมาณ 450 กรัม)', 60, 90, '{lunch,dinner}', '{seafood,shrimp,egg,noodle,soup}', 'unverified'),
  ('pad-thai-goong',         'ผัดไทยกุ้ง',                  'Pad thai with shrimp', 'noodle', 300, 'g', '1 จาน (ประมาณ 300 กรัม)', 60, 90, '{lunch,dinner}', '{shrimp,seafood,egg,peanut,noodle,street_food}', 'unverified'),
  ('pad-see-ew-moo',         'ผัดซีอิ๊วหมู',                'Stir-fried noodles with soy sauce and pork', 'noodle', 300, 'g', '1 จาน (ประมาณ 300 กรัม)', 50, 70, '{lunch,dinner}', '{pork,egg,noodle,street_food}', 'unverified'),
  ('tom-yum-goong',          'ต้มยำกุ้ง (น้ำใส)',          'Clear tom yum soup with shrimp', 'soup', 350, 'g', '1 ถ้วย (ประมาณ 350 กรัม)', 80, 150, '{lunch,dinner}', '{shrimp,seafood,spicy,soup}', 'unverified'),
  ('gaeng-jued-tao-hoo',     'แกงจืดเต้าหู้หมูสับ',         'Clear soup with tofu and minced pork', 'soup', 350, 'g', '1 ถ้วย (ประมาณ 350 กรัม)', 40, 70, '{lunch,dinner}', '{pork,tofu,soup,low_fat,home_cooked}', 'unverified'),
  ('gaeng-keaw-wan-gai',     'แกงเขียวหวานไก่',             'Green curry with chicken', 'curry', 250, 'g', '1 ถ้วย (ประมาณ 250 กรัม) ไม่รวมข้าว', 40, 70, '{lunch,dinner}', '{chicken,spicy,dairy}', 'unverified'),
  ('khao-suay',              'ข้าวสวย',                     'Steamed jasmine rice', 'rice_dish', 150, 'g', '1 ทัพพีใหญ่ (ประมาณ 150 กรัม)', 10, 15, '{breakfast,lunch,dinner}', '{rice,vegan,vegetarian}', 'unverified'),
  ('khai-tom',               'ไข่ต้ม',                      'Boiled egg', 'protein', 50, 'g', '1 ฟอง (ประมาณ 50 กรัม)', 8, 15, '{breakfast,snack}', '{egg,high_protein,vegetarian,quick,convenience_store}', 'unverified'),
  ('ok-gai-yang',            'อกไก่ย่าง',                   'Grilled chicken breast', 'protein', 100, 'g', '1 ชิ้น (ประมาณ 100 กรัม)', 35, 60, '{lunch,dinner,snack}', '{chicken,high_protein,low_fat,convenience_store}', 'unverified'),
  ('ok-gai-sous-vide',       'อกไก่นุ่มพร้อมทาน',           'Ready-to-eat chicken breast', 'protein', 100, 'g', '1 ซอง (ประมาณ 100 กรัม)', 35, 50, '{breakfast,lunch,snack}', '{chicken,high_protein,low_fat,convenience_store,quick}', 'unverified'),
  ('salad-ok-gai',           'สลัดอกไก่',                   'Chicken breast salad', 'salad', 250, 'g', '1 กล่อง (ประมาณ 250 กรัม) รวมน้ำสลัดใส', 60, 100, '{lunch,dinner}', '{chicken,high_protein,low_fat,convenience_store}', 'unverified'),
  ('som-tam-thai',           'ส้มตำไทย',                    'Green papaya salad (Thai style)', 'salad', 200, 'g', '1 จาน (ประมาณ 200 กรัม)', 40, 60, '{lunch,dinner}', '{peanut,shrimp,spicy,street_food}', 'unverified'),
  ('yum-woon-sen',           'ยำวุ้นเส้น',                  'Glass noodle salad', 'salad', 250, 'g', '1 จาน (ประมาณ 250 กรัม)', 50, 80, '{lunch,dinner}', '{pork,shrimp,seafood,spicy,noodle}', 'unverified'),
  ('khao-niao-gai-yang',     'ข้าวเหนียวไก่ย่าง',           'Sticky rice with grilled chicken', 'rice_dish', 250, 'g', 'ข้าวเหนียว 1 ห่อ + ไก่ย่าง 1 ไม้', 40, 60, '{breakfast,lunch}', '{chicken,rice,street_food,quick}', 'unverified'),
  ('sandwich-tuna',          'แซนด์วิชทูน่า',               'Tuna sandwich', 'breakfast', 120, 'g', '1 ชิ้น (ประมาณ 120 กรัม)', 30, 45, '{breakfast,snack}', '{fish,seafood,egg,quick,convenience_store}', 'unverified'),
  ('nom-jued-pasteurized',   'นมจืดพาสเจอร์ไรส์',           'Plain pasteurised milk', 'drink', 200, 'ml', '1 กล่อง (200 มล.)', 12, 18, '{breakfast,snack}', '{dairy,vegetarian,quick,convenience_store}', 'unverified'),
  ('nom-thua-leuang',        'นมถั่วเหลือง (หวานน้อย)',    'Soy milk, low sugar', 'drink', 250, 'ml', '1 กล่อง (250 มล.)', 12, 20, '{breakfast,snack}', '{vegan,vegetarian,quick,convenience_store}', 'unverified'),
  ('yogurt-plain',           'โยเกิร์ตรสธรรมชาติ',          'Plain yogurt', 'snack', 135, 'g', '1 ถ้วย (ประมาณ 135 กรัม)', 15, 25, '{breakfast,snack}', '{dairy,vegetarian,quick,convenience_store}', 'unverified'),
  ('kluay-hom',              'กล้วยหอม',                    'Banana (Cavendish)', 'fruit', 120, 'g', '1 ผล (ประมาณ 120 กรัม)', 10, 20, '{breakfast,snack}', '{vegan,vegetarian,quick,convenience_store}', 'unverified'),
  ('pla-nueng-manao',        'ปลากะพงนึ่งมะนาว (ส่วนบุคคล)', 'Steamed sea bass with lime (single portion)', 'protein', 200, 'g', '1 ที่ (ประมาณ 200 กรัม)', 120, 250, '{dinner}', '{fish,seafood,spicy,high_protein,low_fat}', 'unverified'),
  ('pad-pak-ruam',           'ผัดผักรวม',                   'Stir-fried mixed vegetables', 'side_dish', 200, 'g', '1 จาน (ประมาณ 200 กรัม) ไม่รวมข้าว', 40, 60, '{lunch,dinner}', '{vegetarian,home_cooked}', 'unverified')
on conflict (slug) do nothing;
