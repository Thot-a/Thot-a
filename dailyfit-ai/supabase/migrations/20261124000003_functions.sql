-- DailyFit AI — RPC functions (entitlements, quota, atomic meal-plan save)

-- New tables/functions must opt in to client access explicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Trigger functions are not callable by clients.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.food_logs_compute_snapshot() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- effective_plan: the single source of truth for entitlements.
-- ---------------------------------------------------------------------------
create or replace function public.effective_plan(p_user_id uuid)
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan
       from public.subscriptions s
      where s.user_id = p_user_id
        and s.plan = 'premium'
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())),
    'free'::public.plan_tier
  );
$$;

revoke execute on function public.effective_plan(uuid) from public, anon, authenticated;
grant execute on function public.effective_plan(uuid) to service_role;

-- Convenience for the app: returns the caller's own plan only.
create or replace function public.my_plan()
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select public.effective_plan((select auth.uid()));
$$;

revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- ---------------------------------------------------------------------------
-- consume_ai_quota: atomically increments today's counter if under the limit.
-- Returns the new count, or -1 when the limit is reached.
-- ---------------------------------------------------------------------------
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_feature public.ai_feature,
  p_daily_limit integer,
  p_usage_date date default (now() at time zone 'Asia/Bangkok')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_daily_limit is null or p_daily_limit < 0 then
    raise exception 'INVALID_LIMIT';
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, feature, request_count)
  values (p_user_id, p_usage_date, p_feature, 0)
  on conflict (user_id, usage_date, feature) do nothing;

  update public.ai_usage_daily
     set request_count = request_count + 1
   where user_id = p_user_id
     and usage_date = p_usage_date
     and feature = p_feature
     and request_count < p_daily_limit
  returning request_count into v_count;

  return coalesce(v_count, -1);
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, public.ai_feature, integer, date) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, public.ai_feature, integer, date) to service_role;

create or replace function public.record_ai_usage(
  p_user_id uuid,
  p_feature public.ai_feature,
  p_input_tokens integer,
  p_output_tokens integer,
  p_est_cost_usd numeric,
  p_usage_date date default (now() at time zone 'Asia/Bangkok')::date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ai_usage_daily (user_id, usage_date, feature, input_tokens, output_tokens, est_cost_usd)
  values (p_user_id, p_usage_date, p_feature, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), greatest(p_est_cost_usd, 0))
  on conflict (user_id, usage_date, feature) do update
     set input_tokens = public.ai_usage_daily.input_tokens + excluded.input_tokens,
         output_tokens = public.ai_usage_daily.output_tokens + excluded.output_tokens,
         est_cost_usd = public.ai_usage_daily.est_cost_usd + excluded.est_cost_usd;
end;
$$;

revoke execute on function public.record_ai_usage(uuid, public.ai_feature, integer, integer, numeric, date) from public, anon, authenticated;
grant execute on function public.record_ai_usage(uuid, public.ai_feature, integer, integer, numeric, date) to service_role;

-- ---------------------------------------------------------------------------
-- save_meal_plan: archive today's active plan and insert the new one atomically.
-- Nutrition/price snapshots are computed here from food_items (never from AI output).
--
-- p_plan shape:
-- {
--   "plan_date": "2026-11-24", "goal": "healthy_lifestyle", "budget_thb": 150, "meals_per_day": 3,
--   "generated_by": "ai" | "fallback", "summary_th": "...", "ai_model": "...", "allow_sample": false,
--   "items": [{"food_item_id": "uuid", "meal_type": "breakfast", "serving_count": 1, "position": 0, "reason_th": "..."}]
-- }
-- ---------------------------------------------------------------------------
create or replace function public.save_meal_plan(p_user_id uuid, p_plan jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_allow_sample boolean := coalesce((p_plan ->> 'allow_sample')::boolean, false);
  v_item jsonb;
  v_food record;
  v_serving numeric;
  v_uses_sample boolean := false;
begin
  if jsonb_typeof(p_plan -> 'items') <> 'array' or jsonb_array_length(p_plan -> 'items') = 0
     or jsonb_array_length(p_plan -> 'items') > 8 then
    raise exception 'INVALID_PLAN_ITEMS' using errcode = 'check_violation';
  end if;

  update public.meal_plans
     set status = 'archived'
   where user_id = p_user_id
     and plan_date = (p_plan ->> 'plan_date')::date
     and status = 'active';

  insert into public.meal_plans (user_id, plan_date, goal, budget_thb, meals_per_day, generated_by, summary_th, ai_model)
  values (
    p_user_id,
    (p_plan ->> 'plan_date')::date,
    (p_plan ->> 'goal')::public.goal_type,
    (p_plan ->> 'budget_thb')::integer,
    (p_plan ->> 'meals_per_day')::smallint,
    p_plan ->> 'generated_by',
    left(p_plan ->> 'summary_th', 500),
    left(p_plan ->> 'ai_model', 100)
  )
  returning id into v_plan_id;

  for v_item in select * from jsonb_array_elements(p_plan -> 'items')
  loop
    select id, energy_kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb, verification_status
      into v_food
      from public.food_items
     where id = (v_item ->> 'food_item_id')::uuid
       and is_active;

    if not found
       or not (v_food.verification_status = 'verified' or (v_allow_sample and v_food.verification_status = 'sample')) then
      raise exception 'FOOD_NOT_USABLE' using errcode = 'check_violation';
    end if;

    if v_food.verification_status = 'sample' then
      v_uses_sample := true;
    end if;

    v_serving := (v_item ->> 'serving_count')::numeric;

    insert into public.meal_plan_items (
      meal_plan_id, food_item_id, meal_type, position, serving_count, reason_th,
      kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb
    ) values (
      v_plan_id,
      v_food.id,
      (v_item ->> 'meal_type')::public.meal_type,
      coalesce((v_item ->> 'position')::smallint, 0),
      v_serving,
      left(v_item ->> 'reason_th', 300),
      round(v_food.energy_kcal * v_serving, 1),
      round(v_food.protein_g * v_serving, 1),
      round(v_food.carbs_g * v_serving, 1),
      round(v_food.fat_g * v_serving, 1),
      round(v_food.price_min_thb * v_serving)::integer,
      round(v_food.price_max_thb * v_serving)::integer
    );
  end loop;

  update public.meal_plans p
     set total_kcal = t.kcal,
         total_protein_g = t.protein_g,
         total_carbs_g = t.carbs_g,
         total_fat_g = t.fat_g,
         total_price_min_thb = t.price_min,
         total_price_max_thb = t.price_max,
         uses_sample_data = v_uses_sample
    from (
      select sum(kcal) kcal, sum(protein_g) protein_g, sum(carbs_g) carbs_g, sum(fat_g) fat_g,
             sum(price_min_thb) price_min, sum(price_max_thb) price_max
        from public.meal_plan_items
       where meal_plan_id = v_plan_id
    ) t
   where p.id = v_plan_id;

  return v_plan_id;
end;
$$;

revoke execute on function public.save_meal_plan(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_meal_plan(uuid, jsonb) to service_role;
