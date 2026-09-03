-- Super Admin Test Mode: one authenticated account, two strictly separated
-- data contexts. Privilege is durable server-side state, never user metadata.

create schema if not exists private;
revoke create on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;
create policy user_roles_read_own on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.user_roles to authenticated;
revoke insert, update, delete on public.user_roles from anon, authenticated;

insert into public.user_roles(user_id,role)
select id,'super_admin' from auth.users where lower(email)=lower('adamonelife@gmail.com')
on conflict do nothing;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='super_admin')$$;
revoke all on function private.is_super_admin() from public,anon;
grant execute on function private.is_super_admin() to authenticated;

create or replace function private.active_data_context()
returns text language sql stable security definer set search_path=''
as $$
  select case when coalesce((current_setting('request.headers',true)::jsonb->>'x-fovyn-data-context'),'real')='test'
    and private.is_super_admin() then 'test' else 'real' end
$$;
revoke all on function private.active_data_context() from public,anon;
grant execute on function private.active_data_context() to authenticated;

create or replace function private.apply_test_provenance()
returns trigger language plpgsql security invoker set search_path=''
as $$begin
  if tg_op='UPDATE' and new.is_test is distinct from old.is_test then
    raise exception using errcode='42501',message='test_provenance_is_immutable';
  end if;
  if tg_op='INSERT' then new.is_test=(private.active_data_context()='test'); end if;
  return new;
end$$;

do $$
declare t text;
begin
  foreach t in array array[
    'cardio_entries','cardio_entry_goals','clearing_goal_treatments','climate_configurations','climate_goal_treatments','climate_periods','current_clearings','daily_roundups',
    'goal_contributions','goal_dormancy_periods','goal_events','goal_rules','goal_trackers','goals','grove_events','grove_goals','groves',
    'habit_entries','habit_schedules','habits','hobbies','hobby_entries','hobby_entry_goals','money_accounts','money_budgets','money_categories','money_recurring_items','money_transaction_goals','money_transactions',
    'note_goals','notes','nutrition_entries','nutrition_entry_goals','nutrition_items','nutrition_targets','periodic_reviews','recovery_enrolments','recovery_exercises','recovery_programmes',
    'recovery_session_responses','recovery_side_performance','recovery_stage_history','routine_actions','routines','sleep_entries','sleep_entry_goals','subcategories','tracker_schedules','trackers','tracking_records',
    'training_exercise_configurations','training_exercises','training_rules','training_sessions','training_templates'
  ] loop
    execute format('alter table public.%I add column if not exists is_test boolean not null default false',t);
    execute format('create index if not exists %I on public.%I(owner_id,is_test)',t||'_owner_test_idx',t);
    execute format('drop trigger if exists set_test_provenance on public.%I',t);
    execute format('create trigger set_test_provenance before insert or update of is_test on public.%I for each row execute function private.apply_test_provenance()',t);
    execute format('drop policy if exists test_context_isolation on public.%I',t);
    execute format('create policy test_context_isolation on public.%I as restrictive for all to authenticated using (owner_id is null or is_test=(private.active_data_context()=''test'')) with check (owner_id is null or is_test=(private.active_data_context()=''test''))',t);
  end loop;
end$$;

-- Nested Training facts carry their own provenance so fake PBs and volume can
-- never enter real calculations, even when queried independently.
do $$
declare t text;
begin
  foreach t in array array['training_session_exercises','training_sets','training_template_slots'] loop
    execute format('alter table public.%I add column if not exists is_test boolean not null default false',t);
    execute format('drop trigger if exists set_test_provenance on public.%I',t);
    execute format('create trigger set_test_provenance before insert or update of is_test on public.%I for each row execute function private.apply_test_provenance()',t);
    execute format('drop policy if exists test_context_isolation on public.%I',t);
    execute format('create policy test_context_isolation on public.%I as restrictive for all to authenticated using (is_test=(private.active_data_context()=''test'')) with check (is_test=(private.active_data_context()=''test''))',t);
  end loop;
end$$;

create table if not exists public.forest_test_overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  area_key text,
  tree_stage smallint check (tree_stage between 1 and 27),
  eligible_days integer check (eligible_days>=0),
  growth_consistency numeric check (growth_consistency between 0 and 100),
  health_state text check (health_state in ('thriving','healthy','needs_water','may_need_pruning')),
  lifecycle_state text check (lifecycle_state in ('nursery','growing','dormant','completed')),
  presentation_priority text check (presentation_priority in ('primary','secondary')),
  clearing_included boolean,
  preset_key text,
  is_test boolean not null default true check (is_test),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,goal_id)
);
alter table public.forest_test_overrides enable row level security;
create policy forest_test_overrides_admin_own on public.forest_test_overrides for all to authenticated
  using ((select auth.uid())=owner_id and private.is_super_admin() and private.active_data_context()='test')
  with check ((select auth.uid())=owner_id and private.is_super_admin() and private.active_data_context()='test' and is_test);
grant select,insert,update,delete on public.forest_test_overrides to authenticated;

create or replace function public.clear_my_test_data(p_domain text default 'all')
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); t text;
begin
  if uid is null or not private.is_super_admin() then raise exception using errcode='42501',message='super_admin_required'; end if;
  if p_domain not in ('all','goals','training','nutrition','money','logs') then raise exception using errcode='22023',message='invalid_test_domain'; end if;
  if p_domain in ('all','training') then
    delete from public.recovery_side_performance where owner_id=uid and is_test;
    delete from public.recovery_session_responses where owner_id=uid and is_test;
    delete from public.training_sessions where owner_id=uid and is_test;
    delete from public.training_templates where owner_id=uid and is_test;
    delete from public.training_exercise_configurations where owner_id=uid and is_test;
    delete from public.training_rules where owner_id=uid and is_test;
    delete from public.training_exercises where owner_id=uid and is_test;
  end if;
  if p_domain in ('all','nutrition') then delete from public.nutrition_entries where owner_id=uid and is_test;delete from public.nutrition_items where owner_id=uid and is_test;delete from public.nutrition_targets where owner_id=uid and is_test;end if;
  if p_domain in ('all','money') then delete from public.money_transactions where owner_id=uid and is_test;delete from public.money_recurring_items where owner_id=uid and is_test;delete from public.money_budgets where owner_id=uid and is_test;delete from public.money_categories where owner_id=uid and is_test;delete from public.money_accounts where owner_id=uid and is_test;end if;
  if p_domain in ('all','goals') then delete from public.forest_test_overrides where owner_id=uid;delete from public.goals where owner_id=uid and is_test;end if;
  if p_domain in ('all','logs') then
    foreach t in array array['tracking_records','habit_entries','hobby_entries','notes','sleep_entries','cardio_entries','daily_roundups','periodic_reviews','routines','habits','hobbies','trackers','current_clearings','climate_periods','climate_configurations','groves','recovery_enrolments','recovery_stage_history'] loop
      execute format('delete from public.%I where owner_id=$1 and is_test',t) using uid;
    end loop;
  end if;
end$$;
revoke all on function public.clear_my_test_data(text) from public,anon;
grant execute on function public.clear_my_test_data(text) to authenticated;

comment on table public.user_roles is 'Durable server-side roles. Super Admin does not bypass private user ownership.';
comment on column public.goals.is_test is 'Explicit immutable QA provenance; never infer test state from names.';
