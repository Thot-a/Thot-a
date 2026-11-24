-- DailyFit AI — Row Level Security
-- Principle: users can only see/modify their own rows. Shared food data is read-only.
-- Writes that must be trusted (AI messages, subscriptions, usage, meal plans) go through
-- service-role Edge Functions / security-definer RPCs.

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.food_sources enable row level security;
alter table public.food_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_feedback enable row level security;
alter table public.user_consents enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.app_events enable row level security;

-- Start from zero privileges for client roles, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select, update (display_name, birth_year, sex, height_cm, weight_kg, goal, activity_level,
                      daily_budget_thb, locale, onboarding_completed_at)
  on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
grant select, update (meals_per_day, liked_tags, excluded_tags, dietary_restrictions, notification_settings)
  on public.user_preferences to authenticated;

create policy user_preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- food_sources / food_items (public read, no client writes)
-- ---------------------------------------------------------------------------
grant select on public.food_sources to anon, authenticated;
grant select on public.food_items to anon, authenticated;

create policy food_sources_read_all on public.food_sources
  for select to anon, authenticated using (true);

-- Only usable rows are visible. `sample` rows exist only in local/staging seeds.
create policy food_items_read_usable on public.food_items
  for select to anon, authenticated
  using (is_active and verification_status in ('verified', 'sample'));

-- ---------------------------------------------------------------------------
-- meal_plans / meal_plan_items (created via save_meal_plan RPC by service role)
-- ---------------------------------------------------------------------------
grant select, delete, update (status) on public.meal_plans to authenticated;
grant select on public.meal_plan_items to authenticated;

create policy meal_plans_select_own on public.meal_plans
  for select to authenticated using (user_id = (select auth.uid()));
create policy meal_plans_update_own on public.meal_plans
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy meal_plans_delete_own on public.meal_plans
  for delete to authenticated using (user_id = (select auth.uid()));

create policy meal_plan_items_select_own on public.meal_plan_items
  for select to authenticated using (
    exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- food_logs (full CRUD on own rows; nutrition snapshot computed by trigger)
-- ---------------------------------------------------------------------------
grant select, delete on public.food_logs to authenticated;
grant insert (food_item_id, meal_plan_item_id, log_date, meal_type, serving_count, price_paid_thb, note)
  on public.food_logs to authenticated;
grant update (food_item_id, log_date, meal_type, serving_count, price_paid_thb, note)
  on public.food_logs to authenticated;

-- user_id defaults to the caller so the client never has to (and cannot) choose it.
alter table public.food_logs alter column user_id set default auth.uid();

create policy food_logs_select_own on public.food_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy food_logs_insert_own on public.food_logs
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      meal_plan_item_id is null
      or exists (
        select 1 from public.meal_plan_items i
        join public.meal_plans p on p.id = i.meal_plan_id
        where i.id = meal_plan_item_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy food_logs_update_own on public.food_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy food_logs_delete_own on public.food_logs
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- AI conversations (read/delete own; writes via Edge Function only)
-- ---------------------------------------------------------------------------
grant select, delete, update (title) on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;

create policy ai_conversations_select_own on public.ai_conversations
  for select to authenticated using (user_id = (select auth.uid()));
create policy ai_conversations_update_own on public.ai_conversations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ai_conversations_delete_own on public.ai_conversations
  for delete to authenticated using (user_id = (select auth.uid()));

create policy ai_messages_select_own on public.ai_messages
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- subscriptions (read-only for users)
-- ---------------------------------------------------------------------------
grant select on public.subscriptions to authenticated;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_feedback
-- ---------------------------------------------------------------------------
alter table public.user_feedback alter column user_id set default auth.uid();
grant select on public.user_feedback to authenticated;
grant insert (feedback_type, target_id, rating, comment) on public.user_feedback to authenticated;

create policy user_feedback_select_own on public.user_feedback
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_feedback_insert_own on public.user_feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_consents (append-only)
-- ---------------------------------------------------------------------------
alter table public.user_consents alter column user_id set default auth.uid();
grant select on public.user_consents to authenticated;
grant insert (consent_type, granted, policy_version) on public.user_consents to authenticated;
grant select on public.current_user_consents to authenticated;

create policy user_consents_select_own on public.user_consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_consents_insert_own on public.user_consents
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_usage_daily (read own; written by service role)
-- ---------------------------------------------------------------------------
grant select on public.ai_usage_daily to authenticated;
create policy ai_usage_daily_select_own on public.ai_usage_daily
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- app_events (insert-only, no reads from client)
-- ---------------------------------------------------------------------------
alter table public.app_events alter column user_id set default auth.uid();
grant insert (event_name, properties) on public.app_events to authenticated;
create policy app_events_insert_own on public.app_events
  for insert to authenticated with check (user_id = (select auth.uid()));
