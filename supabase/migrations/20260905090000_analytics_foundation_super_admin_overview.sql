-- Privacy-safe analytics foundation and the first Super Admin visibility layer.
-- Existing shared-database records are Alpha unless explicitly created through
-- the protected Development preview by a Super Admin.

create or replace function private.active_app_environment()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce(current_setting('request.headers', true)::jsonb ->> 'x-fovyn-environment', 'alpha') = 'development'
      and private.is_super_admin()
    then 'development'
    else 'alpha'
  end
$$;

alter table public.profiles
  add column if not exists app_environment text not null default 'alpha'
    check (app_environment in ('alpha', 'development'));

alter table public.goals
  add column if not exists app_environment text not null default 'alpha'
    check (app_environment in ('alpha', 'development'));

create index if not exists goals_analytics_environment_idx
  on public.goals (app_environment, is_test, status, created_at);

create table if not exists public.goal_lifecycle_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  event_name text not null check (event_name in (
    'goal_created', 'tree_planted', 'goal_made_dormant',
    'goal_awakened', 'goal_completed', 'goal_archived', 'tree_stage_changed'
  )),
  from_status text,
  to_status text,
  from_tree_stage smallint check (from_tree_stage between 1 and 27),
  to_tree_stage smallint check (to_tree_stage between 1 and 27),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  app_environment text not null check (app_environment in ('alpha', 'development')),
  is_test boolean not null default false,
  event_version smallint not null default 1 check (event_version > 0),
  unique (goal_id, event_name, occurred_at, event_version),
  foreign key (goal_id, owner_id) references public.goals(id, owner_id) on delete cascade
);

comment on table public.goal_lifecycle_events is
  'Canonical Goal/Tree lifecycle history. One Goal remains one Tree for life.';

create index if not exists goal_lifecycle_events_analytics_idx
  on public.goal_lifecycle_events (app_environment, is_test, event_name, occurred_at);
create index if not exists goal_lifecycle_events_owner_idx
  on public.goal_lifecycle_events (owner_id, goal_id, occurred_at desc);

alter table public.goal_lifecycle_events enable row level security;
revoke all on public.goal_lifecycle_events from anon, authenticated;
grant select on public.goal_lifecycle_events to authenticated;

drop policy if exists "Owners read Goal lifecycle history" on public.goal_lifecycle_events;
create policy "Owners read Goal lifecycle history"
on public.goal_lifecycle_events for select to authenticated
using ((select auth.uid()) = owner_id);

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  event_name text not null check (event_name ~ '^[a-z][a-z0-9_]*$'),
  feature_key text check (feature_key is null or feature_key ~ '^[a-z][a-z0-9_]*$'),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  app_environment text not null check (app_environment in ('alpha', 'development')),
  app_version text,
  device_class text check (device_class is null or device_class in ('mobile', 'tablet', 'desktop', 'unknown')),
  interface_locale text,
  is_test boolean not null default false,
  event_version smallint not null default 1 check (event_version > 0),
  idempotency_key text not null,
  unique (owner_id, event_name, idempotency_key, event_version)
);

comment on table public.product_events is
  'Privacy-safe meaningful product telemetry. Sensitive values and user-created text are prohibited.';

create index if not exists product_events_analytics_idx
  on public.product_events (app_environment, is_test, event_name, occurred_at);

alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;
grant insert on public.product_events to authenticated;

drop policy if exists "Owners create privacy-safe product events" on public.product_events;
create policy "Owners create privacy-safe product events"
on public.product_events for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and app_environment = private.active_app_environment()
  and is_test = (private.active_data_context() = 'test')
  and not (properties ?| array[
    'amount','balance','value','note','notes','content','message','goal_name',
    'cycle_detail','symptom','sexual_activity','pregnancy_result','health_value'
  ])
);

create or replace function private.assign_goal_app_environment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.app_environment := private.active_app_environment();
  else
    new.app_environment := old.app_environment;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_goal_app_environment on public.goals;
create trigger assign_goal_app_environment
before insert or update of app_environment on public.goals
for each row execute function private.assign_goal_app_environment();

create or replace function private.capture_goal_analytics_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.goal_lifecycle_events
      (owner_id, goal_id, event_name, to_status, to_tree_stage, occurred_at, app_environment, is_test)
    values
      (new.owner_id, new.id, 'goal_created', new.status, new.forest_stage, new.created_at, new.app_environment, new.is_test),
      (new.owner_id, new.id, 'tree_planted', new.status, new.forest_stage, new.created_at, new.app_environment, new.is_test)
    on conflict do nothing;
  else
    if new.status is distinct from old.status then
      insert into public.goal_lifecycle_events
        (owner_id, goal_id, event_name, from_status, to_status, to_tree_stage, occurred_at, app_environment, is_test)
      values (
        new.owner_id, new.id,
        case
          when new.status = 'dormant' then 'goal_made_dormant'
          when old.status = 'dormant' and new.status = 'active' then 'goal_awakened'
          when new.status = 'completed' then 'goal_completed'
          when new.status in ('archived', 'ended') then 'goal_archived'
          else 'goal_awakened'
        end,
        old.status, new.status, new.forest_stage, now(), new.app_environment, new.is_test
      ) on conflict do nothing;
    end if;
    if new.forest_stage is distinct from old.forest_stage then
      insert into public.goal_lifecycle_events
        (owner_id, goal_id, event_name, from_status, to_status, from_tree_stage, to_tree_stage, occurred_at, app_environment, is_test)
      values
        (new.owner_id, new.id, 'tree_stage_changed', old.status, new.status, old.forest_stage, new.forest_stage,
         coalesce(new.forest_stage_updated_at, now()), new.app_environment, new.is_test)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists capture_goal_analytics_history on public.goals;
create trigger capture_goal_analytics_history
after insert or update of status, forest_stage on public.goals
for each row execute function private.capture_goal_analytics_history();

-- Preserve the planting history already represented by existing canonical Goals.
insert into public.goal_lifecycle_events
  (owner_id, goal_id, event_name, to_status, to_tree_stage, occurred_at, app_environment, is_test)
select owner_id, id, event_name, status, forest_stage, created_at, app_environment, is_test
from public.goals
cross join (values ('goal_created'), ('tree_planted')) as events(event_name)
on conflict do nothing;

create or replace function public.super_admin_overview(p_environment text default 'alpha')
returns table (
  environment text,
  release_label text,
  users bigint,
  verified_users bigint,
  trees_planted bigint,
  active_goals bigint,
  dormant_trees bigint,
  heartwood_trees bigint,
  new_users_last_7_days bigint,
  trees_planted_last_7_days bigint,
  excluded_test_trees bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required' using errcode = '42501';
  end if;
  if p_environment not in ('alpha', 'development') then
    raise exception 'Unknown application environment' using errcode = '22023';
  end if;
  return query
  select
    p_environment,
    case when p_environment = 'alpha' then 'FOVYN ALPHA' else 'DEVELOPMENT' end,
    count(distinct p.id) filter (where p.app_environment = p_environment),
    count(distinct p.id) filter (where p.app_environment = p_environment and u.email_confirmed_at is not null),
    count(distinct g.id) filter (where g.app_environment = p_environment and not g.is_test),
    count(distinct g.id) filter (where g.app_environment = p_environment and not g.is_test and g.status = 'active'),
    count(distinct g.id) filter (where g.app_environment = p_environment and not g.is_test and g.status = 'dormant'),
    count(distinct g.id) filter (where g.app_environment = p_environment and not g.is_test and g.status = 'completed'),
    count(distinct p.id) filter (where p.app_environment = p_environment and p.created_at >= now() - interval '7 days'),
    count(distinct g.id) filter (where g.app_environment = p_environment and not g.is_test and g.created_at >= now() - interval '7 days'),
    count(distinct g.id) filter (where g.app_environment = p_environment and g.is_test)
  from public.profiles p
  join auth.users u on u.id = p.id
  full join public.goals g on g.owner_id = p.id;
end;
$$;

revoke all on function public.super_admin_overview(text) from public, anon;
grant execute on function public.super_admin_overview(text) to authenticated;
