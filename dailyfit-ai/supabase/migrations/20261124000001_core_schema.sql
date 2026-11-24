-- DailyFit AI — core schema
-- Enums, tables, constraints, indexes and triggers.
-- RLS policies live in 20261124000002_rls_policies.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.goal_type as enum ('healthy_lifestyle', 'weight_management', 'muscle_support', 'balanced_nutrition');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.sex_type as enum ('female', 'male', 'unspecified');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.verification_status as enum ('unverified', 'sample', 'verified', 'rejected');
create type public.plan_status as enum ('active', 'archived');
create type public.plan_tier as enum ('free', 'premium');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'expired');
create type public.subscription_provider as enum ('none', 'app_store', 'google_play', 'stripe', 'manual');
create type public.consent_type as enum ('privacy_policy', 'terms', 'health_data', 'ai_personalization', 'analytics', 'marketing');
create type public.ai_feature as enum ('meal_plan', 'meal_swap', 'coach');
create type public.feedback_type as enum ('meal_plan', 'food_item', 'coach_message', 'app');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Allowlists for tags. Free text is intentionally not accepted (prompt-injection + data minimisation).
create or replace function public.allowed_food_tags()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'chicken', 'pork', 'beef', 'seafood', 'fish', 'shrimp', 'egg', 'tofu', 'dairy', 'peanut',
    'vegetarian', 'vegan', 'spicy', 'fried', 'soup', 'rice', 'noodle', 'high_protein',
    'low_fat', 'quick', 'convenience_store', 'street_food', 'home_cooked', 'halal'
  ]::text[];
$$;

create or replace function public.allowed_dietary_restrictions()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'vegetarian', 'vegan', 'halal', 'no_pork', 'no_beef', 'no_seafood',
    'seafood_allergy', 'peanut_allergy', 'egg_allergy', 'lactose_free', 'less_spicy'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 50),
  birth_year smallint check (birth_year is null or (birth_year >= 1920 and birth_year <= extract(year from now())::int - 13)),
  sex public.sex_type,
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 100 and 250),
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 25 and 300),
  goal public.goal_type not null default 'healthy_lifestyle',
  activity_level public.activity_level not null default 'light',
  daily_budget_thb integer not null default 150 check (daily_budget_thb between 30 and 2000),
  locale text not null default 'th' check (locale in ('th', 'en')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  meals_per_day smallint not null default 3 check (meals_per_day between 2 and 4),
  liked_tags text[] not null default '{}' check (liked_tags <@ public.allowed_food_tags() and cardinality(liked_tags) <= 20),
  excluded_tags text[] not null default '{}' check (excluded_tags <@ public.allowed_food_tags() and cardinality(excluded_tags) <= 20),
  dietary_restrictions text[] not null default '{}' check (dietary_restrictions <@ public.allowed_dietary_restrictions() and cardinality(dietary_restrictions) <= 11),
  notification_settings jsonb not null default '{"meal_reminders": false}'::jsonb
    check (jsonb_typeof(notification_settings) = 'object' and pg_column_size(notification_settings) <= 1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- food_sources / food_items  (shared, read-only for users)
-- ---------------------------------------------------------------------------
create table public.food_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 200),
  publisher text,
  url text check (url is null or url ~ '^https://'),
  license_note text,
  accessed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger food_sources_set_updated_at before update on public.food_sources
  for each row execute function public.set_updated_at();

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_th text not null check (char_length(btrim(name_th)) between 1 and 120),
  name_en text check (name_en is null or char_length(btrim(name_en)) between 1 and 120),
  category text not null check (category in (
    'rice_dish', 'noodle', 'soup', 'curry', 'salad', 'side_dish', 'protein', 'breakfast', 'snack', 'drink', 'fruit'
  )),
  serving_size numeric(7, 1) not null check (serving_size > 0),
  serving_unit text not null check (serving_unit in ('g', 'ml')),
  serving_description_th text not null check (char_length(serving_description_th) between 1 and 120),
  energy_kcal numeric(6, 1) check (energy_kcal is null or energy_kcal between 0 and 3000),
  protein_g numeric(5, 1) check (protein_g is null or protein_g between 0 and 300),
  carbs_g numeric(5, 1) check (carbs_g is null or carbs_g between 0 and 500),
  fat_g numeric(5, 1) check (fat_g is null or fat_g between 0 and 300),
  price_min_thb integer check (price_min_thb is null or price_min_thb between 0 and 5000),
  price_max_thb integer check (price_max_thb is null or price_max_thb between 0 and 5000),
  meal_types public.meal_type[] not null default '{}',
  tags text[] not null default '{}' check (tags <@ public.allowed_food_tags()),
  image_path text check (image_path is null or image_path ~ '^[a-z0-9/_.-]+$'),
  description_th text check (description_th is null or char_length(description_th) <= 300),
  source_id uuid references public.food_sources (id) on delete restrict,
  source_reference text,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by text,
  is_active boolean not null default true,
  data_updated_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_items_price_range check (price_min_thb is null or price_max_thb is null or price_min_thb <= price_max_thb),
  -- Items used for recommendations must carry full nutrition numbers.
  constraint food_items_nutrition_required check (
    verification_status not in ('verified', 'sample')
    or (energy_kcal is not null and protein_g is not null and carbs_g is not null and fat_g is not null
        and price_min_thb is not null and price_max_thb is not null and cardinality(meal_types) > 0)
  ),
  -- Verified items must cite a source and a reviewer.
  constraint food_items_verified_has_source check (
    verification_status <> 'verified'
    or (source_id is not null and verified_at is not null and verified_by is not null)
  )
);

create unique index food_items_name_th_unique on public.food_items (lower(btrim(name_th)));
create index food_items_usable_idx on public.food_items (verification_status, is_active);
create index food_items_meal_types_idx on public.food_items using gin (meal_types);
create index food_items_tags_idx on public.food_items using gin (tags);

create trigger food_items_set_updated_at before update on public.food_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_plans / meal_plan_items
-- ---------------------------------------------------------------------------
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_date date not null,
  status public.plan_status not null default 'active',
  goal public.goal_type not null,
  budget_thb integer not null check (budget_thb between 30 and 2000),
  meals_per_day smallint not null check (meals_per_day between 2 and 4),
  total_kcal numeric(7, 1) not null default 0,
  total_protein_g numeric(6, 1) not null default 0,
  total_carbs_g numeric(6, 1) not null default 0,
  total_fat_g numeric(6, 1) not null default 0,
  total_price_min_thb integer not null default 0,
  total_price_max_thb integer not null default 0,
  generated_by text not null check (generated_by in ('ai', 'fallback')),
  summary_th text check (summary_th is null or char_length(summary_th) <= 500),
  uses_sample_data boolean not null default false,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index meal_plans_one_active_per_day on public.meal_plans (user_id, plan_date) where status = 'active';
create index meal_plans_user_date_idx on public.meal_plans (user_id, plan_date desc);

create trigger meal_plans_set_updated_at before update on public.meal_plans
  for each row execute function public.set_updated_at();

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  food_item_id uuid not null references public.food_items (id) on delete restrict,
  meal_type public.meal_type not null,
  position smallint not null default 0 check (position between 0 and 5),
  serving_count numeric(3, 1) not null default 1 check (serving_count between 0.5 and 3),
  reason_th text check (reason_th is null or char_length(reason_th) <= 300),
  kcal numeric(7, 1) not null,
  protein_g numeric(6, 1) not null,
  carbs_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  price_min_thb integer not null,
  price_max_thb integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_plan_id, meal_type, position)
);

create index meal_plan_items_plan_idx on public.meal_plan_items (meal_plan_id);
create index meal_plan_items_food_idx on public.meal_plan_items (food_item_id);

create trigger meal_plan_items_set_updated_at before update on public.meal_plan_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- food_logs
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_item_id uuid not null references public.food_items (id) on delete restrict,
  meal_plan_item_id uuid references public.meal_plan_items (id) on delete set null,
  log_date date not null,
  meal_type public.meal_type not null,
  serving_count numeric(3, 2) not null default 1 check (serving_count between 0.25 and 5),
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  price_paid_thb integer check (price_paid_thb is null or price_paid_thb between 0 and 5000),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_logs_date_sane check (log_date between date '2024-01-01' and (current_date + 1))
);

create index food_logs_user_date_idx on public.food_logs (user_id, log_date desc);

-- Snapshot nutrition is always computed from the food database, never trusted from the client.
create or replace function public.food_logs_compute_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f record;
begin
  select energy_kcal, protein_g, carbs_g, fat_g, verification_status, is_active
    into f
    from public.food_items
   where id = new.food_item_id;

  if not found or f.energy_kcal is null or not f.is_active
     or f.verification_status not in ('verified', 'sample') then
    raise exception 'FOOD_NOT_LOGGABLE' using errcode = 'check_violation';
  end if;

  new.kcal := round(f.energy_kcal * new.serving_count, 1);
  new.protein_g := round(f.protein_g * new.serving_count, 1);
  new.carbs_g := round(f.carbs_g * new.serving_count, 1);
  new.fat_g := round(f.fat_g * new.serving_count, 1);
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger food_logs_compute_snapshot
  before insert or update of food_item_id, serving_count, kcal, protein_g, carbs_g, fat_g on public.food_logs
  for each row execute function public.food_logs_compute_snapshot();

create trigger food_logs_set_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI conversations
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text check (title is null or char_length(title) <= 80),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_idx on public.ai_conversations (user_id, last_message_at desc);

create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  ai_model text,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.plan_tier not null default 'free',
  status public.subscription_status not null default 'active',
  provider public.subscription_provider not null default 'none',
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_provider_ref_unique on public.subscriptions (provider, provider_ref) where provider_ref is not null;

create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_feedback
-- ---------------------------------------------------------------------------
create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  feedback_type public.feedback_type not null,
  target_id uuid,
  rating smallint check (rating is null or rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  constraint user_feedback_not_empty check (rating is not null or comment is not null)
);

create index user_feedback_user_idx on public.user_feedback (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- user_consents (append-only)
-- ---------------------------------------------------------------------------
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  policy_version text not null check (policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  created_at timestamptz not null default now()
);

create index user_consents_user_type_idx on public.user_consents (user_id, consent_type, created_at desc);

create view public.current_user_consents
with (security_invoker = true)
as
select distinct on (user_id, consent_type)
       user_id, consent_type, granted, policy_version, created_at
  from public.user_consents
 order by user_id, consent_type, created_at desc, id desc;

-- ---------------------------------------------------------------------------
-- ai_usage_daily (quota + cost tracking)
-- ---------------------------------------------------------------------------
create table public.ai_usage_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  feature public.ai_feature not null,
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  est_cost_usd numeric(12, 6) not null default 0 check (est_cost_usd >= 0),
  primary key (user_id, usage_date, feature)
);

-- ---------------------------------------------------------------------------
-- app_events (privacy-first internal analytics)
-- ---------------------------------------------------------------------------
create table public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  event_name text not null check (event_name in (
    'app_opened', 'signup_completed', 'onboarding_completed', 'meal_plan_generated', 'meal_swapped',
    'meal_plan_viewed', 'food_logged', 'coach_message_sent', 'progress_viewed', 'paywall_viewed',
    'subscription_started', 'feedback_submitted'
  )),
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 2048),
  created_at timestamptz not null default now()
);

create index app_events_name_time_idx on public.app_events (event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- New-user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  if v_name is not null and char_length(v_name) > 50 then
    v_name := left(v_name, 50);
  end if;
  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
