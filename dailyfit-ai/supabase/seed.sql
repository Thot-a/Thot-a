-- ============================================================================
-- LOCAL / STAGING DEVELOPMENT SEED — NOT FOR PRODUCTION
-- ============================================================================
-- The nutrition numbers below are ROUGH PLACEHOLDERS for UI and pipeline
-- development only. They are NOT verified, NOT from a cited source, and must
-- NEVER be shown to real users as nutrition advice. Rows are marked
-- verification_status = 'sample' and the app shows a "ข้อมูลตัวอย่าง" banner.
-- The meal planner only uses them when ALLOW_SAMPLE_FOOD=true.
-- ============================================================================

insert into public.food_sources (name, publisher, notes)
values ('DailyFit development placeholder (NOT VERIFIED)', 'DailyFit AI', 'Placeholder values for development only.')
on conflict (name) do nothing;

with src as (select id from public.food_sources where name = 'DailyFit development placeholder (NOT VERIFIED)'),
v(slug, kcal, p, c, f) as (values
  ('khao-kaprao-gai', 550, 25, 65, 20),
  ('khao-kaprao-gai-khai-dao', 640, 31, 65, 27),
  ('khao-pad-gai', 580, 22, 75, 20),
  ('khao-man-gai', 600, 25, 70, 23),
  ('khao-man-gai-tom', 480, 28, 68, 10),
  ('khao-khai-jiao', 450, 14, 45, 24),
  ('khao-moo-daeng', 540, 24, 75, 15),
  ('khao-pad-krapao-moo-sap', 580, 23, 65, 25),
  ('khao-na-gai', 520, 22, 75, 14),
  ('khao-tom-gai', 280, 18, 40, 5),
  ('khao-tom-moo', 300, 16, 40, 8),
  ('jok-moo', 270, 14, 38, 7),
  ('kuay-tiew-nam-gai', 330, 20, 45, 8),
  ('kuay-tiew-nam-moo', 350, 18, 45, 10),
  ('kuay-tiew-tom-yum', 420, 20, 50, 15),
  ('suki-nam-gai', 330, 24, 40, 8),
  ('suki-nam-talay', 320, 24, 40, 6),
  ('pad-thai-goong', 550, 18, 70, 22),
  ('pad-see-ew-moo', 600, 20, 75, 24),
  ('tom-yum-goong', 180, 18, 10, 7),
  ('gaeng-jued-tao-hoo', 160, 14, 8, 8),
  ('gaeng-keaw-wan-gai', 300, 18, 10, 21),
  ('khao-suay', 200, 4, 44, 0.5),
  ('khai-tom', 75, 6.5, 0.5, 5),
  ('ok-gai-yang', 165, 31, 0, 4),
  ('ok-gai-sous-vide', 120, 24, 2, 2),
  ('salad-ok-gai', 250, 28, 12, 9),
  ('som-tam-thai', 150, 5, 25, 4),
  ('yum-woon-sen', 260, 16, 30, 8),
  ('khao-niao-gai-yang', 480, 25, 60, 14),
  ('sandwich-tuna', 280, 14, 30, 11),
  ('nom-jued-pasteurized', 130, 6.5, 9.5, 7.5),
  ('nom-thua-leuang', 120, 7, 12, 5),
  ('yogurt-plain', 100, 5, 9, 4.5),
  ('kluay-hom', 110, 1.3, 27, 0.4),
  ('pla-nueng-manao', 230, 38, 8, 5),
  ('pad-pak-ruam', 180, 5, 14, 12)
)
update public.food_items fi
   set energy_kcal = v.kcal, protein_g = v.p, carbs_g = v.c, fat_g = v.f,
       verification_status = 'sample', source_id = (select id from src),
       source_reference = 'DEV-PLACEHOLDER'
  from v
 where fi.slug = v.slug;
