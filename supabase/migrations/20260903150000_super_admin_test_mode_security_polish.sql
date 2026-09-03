-- Keep the authenticated clear operation inside ordinary RLS rather than
-- granting it definer privileges. The function still verifies Super Admin.
create or replace function public.clear_my_test_data(p_domain text default 'all')
returns void language plpgsql security invoker set search_path=''
as $$
declare uid uuid:=(select auth.uid()); t text;
begin
  if uid is null or not private.is_super_admin() then raise exception using errcode='42501',message='super_admin_required'; end if;
  if p_domain not in ('all','goals','training','nutrition','money','logs') then raise exception using errcode='22023',message='invalid_test_domain'; end if;
  if p_domain in ('all','training') then delete from public.recovery_side_performance where owner_id=uid and is_test;delete from public.recovery_session_responses where owner_id=uid and is_test;delete from public.training_sessions where owner_id=uid and is_test;delete from public.training_templates where owner_id=uid and is_test;delete from public.training_exercise_configurations where owner_id=uid and is_test;delete from public.training_rules where owner_id=uid and is_test;delete from public.training_exercises where owner_id=uid and is_test;end if;
  if p_domain in ('all','nutrition') then delete from public.nutrition_entries where owner_id=uid and is_test;delete from public.nutrition_items where owner_id=uid and is_test;delete from public.nutrition_targets where owner_id=uid and is_test;end if;
  if p_domain in ('all','money') then delete from public.money_transactions where owner_id=uid and is_test;delete from public.money_recurring_items where owner_id=uid and is_test;delete from public.money_budgets where owner_id=uid and is_test;delete from public.money_categories where owner_id=uid and is_test;delete from public.money_accounts where owner_id=uid and is_test;end if;
  if p_domain in ('all','goals') then delete from public.forest_test_overrides where owner_id=uid;delete from public.goals where owner_id=uid and is_test;end if;
  if p_domain in ('all','logs') then foreach t in array array['tracking_records','habit_entries','hobby_entries','notes','sleep_entries','cardio_entries','daily_roundups','periodic_reviews','routines','habits','hobbies','trackers','current_clearings','climate_periods','climate_configurations','groves','recovery_enrolments','recovery_stage_history'] loop execute format('delete from public.%I where owner_id=$1 and is_test',t) using uid;end loop;end if;
end$$;
create index if not exists forest_test_overrides_goal_idx on public.forest_test_overrides(goal_id);
