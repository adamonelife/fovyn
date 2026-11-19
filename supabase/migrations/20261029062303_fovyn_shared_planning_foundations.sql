-- LOCAL DEVELOPMENT ONLY until separately approved for the shared Alpha backend.
-- Reuses profiles, goals, private.active_data_context and immutable test provenance.
-- No user records, programme defaults, role assignments or feature data are seeded.
begin;
alter table public.goals add constraint goals_planning_scope_key unique (id, owner_id, is_test);
create table public.user_plan_settings (
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  is_test boolean not null default false,
  programme_name text check (programme_name is null or length(trim(programme_name)) between 1 and 120),
  starts_on date,
  target_on date,
  preferred_modules text[] not null default array['Health','Money','Projects','Life'],
  dashboard_sections text[] not null default array['priorities','schedule','foundation','progress','attention'],
  area_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(area_preferences)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (owner_id,is_test),
  check ((starts_on is null and target_on is null) or (starts_on is not null and target_on is not null and target_on>=starts_on)),
  check (preferred_modules <@ array['Health','Money','Projects','Life']::text[]),
  check (dashboard_sections <@ array['priorities','schedule','foundation','progress','attention']::text[])
);
create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  is_test boolean not null default false,
  goal_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 120),
  due_on date, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id,goal_id,owner_id,is_test),
  foreign key (goal_id,owner_id,is_test) references public.goals(id,owner_id,is_test) on delete cascade
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  is_test boolean not null default false,
  goal_id uuid not null, milestone_id uuid,
  title text not null check (length(trim(title)) between 1 and 120),
  due_on date, scheduled_on date, scheduled_time time, focus_on date,
  status text not null default 'todo' check (status in ('todo','doing','blocked','done','cancelled')),
  blocked_reason text not null default '', completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (goal_id,owner_id,is_test) references public.goals(id,owner_id,is_test) on delete cascade,
  foreign key (milestone_id,goal_id,owner_id,is_test) references public.goal_milestones(id,goal_id,owner_id,is_test),
  check ((status='done')=(completed_at is not null)),
  check (status<>'blocked' or length(trim(blocked_reason))>0),
  check (scheduled_time is null or scheduled_on is not null)
);
create index goal_milestones_scope_goal_idx on public.goal_milestones(owner_id,is_test,goal_id,due_on);
create index tasks_scope_goal_idx on public.tasks(owner_id,is_test,goal_id);
create index tasks_due_open_idx on public.tasks(owner_id,is_test,due_on) where status in ('todo','doing','blocked');
create index tasks_milestone_fk_idx on public.tasks(milestone_id,goal_id,owner_id,is_test);
create or replace function private.planning_touch_updated_at()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function private.planning_touch_updated_at() from public,anon;
do $$
declare t text;
begin
 foreach t in array array['user_plan_settings','goal_milestones','tasks'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy planning_owner on public.%I for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))',t);
  execute format('create policy planning_context on public.%I as restrictive for all to authenticated using (is_test=((select private.active_data_context())=''test'')) with check (is_test=((select private.active_data_context())=''test''))',t);
  execute format('create policy planning_test_cleanup on public.%I as restrictive for delete to authenticated using (is_test and (select private.is_super_admin()))',t);
  execute format('create trigger set_test_provenance before insert or update of is_test on public.%I for each row execute function private.apply_test_provenance()',t);
  execute format('create trigger planning_updated_at before update on public.%I for each row execute function private.planning_touch_updated_at()',t);
 end loop;
end $$;
comment on table public.user_plan_settings is 'Owner-scoped programme and presentation settings, separate from Fovyn product identity. No founder defaults.';
comment on table public.goal_milestones is 'Goal checkpoints; same owner and real/test context as the parent goal.';
comment on table public.tasks is 'Canonical planning actions shared by views; completion does not create a tracking record.';
-- Preserve the existing RPC guard and non-planning paths; add one domain.
CREATE OR REPLACE FUNCTION public.clear_my_test_data(p_domain text DEFAULT 'all'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare uid uuid:=(select auth.uid()); t text;
begin
  if uid is null or not private.is_super_admin() then raise exception using errcode='42501',message='super_admin_required'; end if;
  if p_domain not in ('all','goals','training','nutrition','money','logs','planning') then raise exception using errcode='22023',message='invalid_test_domain'; end if;
  -- New domains participate in explicit owner-scoped Test Mode cleanup.
  -- Restrictive DELETE policies forbid deleting real rows or other owners.
  if p_domain in ('all','goals','planning') then
    delete from public.tasks where owner_id=uid and is_test;
    delete from public.goal_milestones where owner_id=uid and is_test;
  end if;
  if p_domain in ('all','planning') then
    delete from public.user_plan_settings where owner_id=uid and is_test;
  end if;
  if p_domain='planning' then return; end if;
  if p_domain in ('all','training') then delete from public.recovery_side_performance where owner_id=uid and is_test;delete from public.recovery_session_responses where owner_id=uid and is_test;delete from public.training_sessions where owner_id=uid and is_test;delete from public.training_templates where owner_id=uid and is_test;delete from public.training_exercise_configurations where owner_id=uid and is_test;delete from public.training_rules where owner_id=uid and is_test;delete from public.training_exercises where owner_id=uid and is_test;end if;
  if p_domain in ('all','nutrition') then delete from public.nutrition_entries where owner_id=uid and is_test;delete from public.nutrition_items where owner_id=uid and is_test;delete from public.nutrition_targets where owner_id=uid and is_test;end if;
  if p_domain in ('all','money') then delete from public.money_transactions where owner_id=uid and is_test;delete from public.money_recurring_items where owner_id=uid and is_test;delete from public.money_budgets where owner_id=uid and is_test;delete from public.money_categories where owner_id=uid and is_test;delete from public.money_accounts where owner_id=uid and is_test;end if;
  if p_domain in ('all','goals') then delete from public.forest_test_overrides where owner_id=uid;delete from public.goals where owner_id=uid and is_test;end if;
  if p_domain in ('all','logs') then foreach t in array array['tracking_records','habit_entries','hobby_entries','notes','sleep_entries','cardio_entries','daily_roundups','periodic_reviews','routines','habits','hobbies','trackers','current_clearings','climate_periods','climate_configurations','groves','recovery_enrolments','recovery_stage_history'] loop execute format('delete from public.%I where owner_id=$1 and is_test',t) using uid;end loop;end if;
end$function$;


revoke all on function public.clear_my_test_data(text) from public,anon;
grant execute on function public.clear_my_test_data(text) to authenticated;
commit;
