-- DailyFit AI — swap a single meal in a plan (service role only).
-- Recomputes the item snapshot and plan totals from food_items.

create or replace function public.swap_meal_plan_item(
  p_user_id uuid,
  p_item_id uuid,
  p_food_item_id uuid,
  p_reason_th text,
  p_allow_sample boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_serving numeric;
  v_food record;
begin
  select i.meal_plan_id, i.serving_count into v_plan_id, v_serving
    from public.meal_plan_items i
    join public.meal_plans p on p.id = i.meal_plan_id
   where i.id = p_item_id and p.user_id = p_user_id and p.status = 'active';
  if not found then
    raise exception 'ITEM_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select id, energy_kcal, protein_g, carbs_g, fat_g, price_min_thb, price_max_thb, verification_status
    into v_food
    from public.food_items
   where id = p_food_item_id and is_active;
  if not found
     or not (v_food.verification_status = 'verified' or (p_allow_sample and v_food.verification_status = 'sample')) then
    raise exception 'FOOD_NOT_USABLE' using errcode = 'check_violation';
  end if;

  update public.meal_plan_items
     set food_item_id = v_food.id,
         reason_th = left(p_reason_th, 300),
         kcal = round(v_food.energy_kcal * v_serving, 1),
         protein_g = round(v_food.protein_g * v_serving, 1),
         carbs_g = round(v_food.carbs_g * v_serving, 1),
         fat_g = round(v_food.fat_g * v_serving, 1),
         price_min_thb = round(v_food.price_min_thb * v_serving)::integer,
         price_max_thb = round(v_food.price_max_thb * v_serving)::integer
   where id = p_item_id;

  update public.meal_plans p
     set total_kcal = t.kcal,
         total_protein_g = t.protein_g,
         total_carbs_g = t.carbs_g,
         total_fat_g = t.fat_g,
         total_price_min_thb = t.price_min,
         total_price_max_thb = t.price_max,
         uses_sample_data = t.uses_sample
    from (
      select sum(i.kcal) kcal, sum(i.protein_g) protein_g, sum(i.carbs_g) carbs_g, sum(i.fat_g) fat_g,
             sum(i.price_min_thb) price_min, sum(i.price_max_thb) price_max,
             bool_or(f.verification_status = 'sample') uses_sample
        from public.meal_plan_items i
        join public.food_items f on f.id = i.food_item_id
       where i.meal_plan_id = v_plan_id
    ) t
   where p.id = v_plan_id;

  return v_plan_id;
end;
$$;

revoke execute on function public.swap_meal_plan_item(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.swap_meal_plan_item(uuid, uuid, uuid, text, boolean) to service_role;
