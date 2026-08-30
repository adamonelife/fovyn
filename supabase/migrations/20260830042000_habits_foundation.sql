create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  description text,
  direction text not null default 'build' check (direction in ('build', 'avoid')),
  tracking_type text not null default 'check' check (tracking_type in ('check', 'count', 'duration')),
  target_value numeric not null default 1 check (target_value > 0),
  unit text,
  color text,
  active boolean not null default true,
  start_date date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  owner_id uuid not null,
  frequency_type text not null default 'daily' check (frequency_type in ('daily', 'specific_days', 'times_per_week')),
  days_of_week smallint[] not null default '{}' check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  target_count smallint not null default 1 check (target_count > 0),
  effective_from date not null default current_date,
  effective_to date check (effective_to is null or effective_to >= effective_from),
  created_at timestamptz not null default now(),
  foreign key (habit_id, owner_id) references public.habits(id, owner_id) on delete cascade
);

create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  owner_id uuid not null,
  entry_date date not null,
  status text not null check (status in ('complete', 'failed', 'skipped')),
  value numeric,
  note text,
  schedule_id uuid references public.habit_schedules(id) on delete set null,
  target_snapshot numeric not null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, owner_id) references public.habits(id, owner_id) on delete cascade,
  unique (habit_id, entry_date)
);

create index if not exists habits_owner_active_idx on public.habits(owner_id, active);
create index if not exists habit_schedules_owner_habit_dates_idx on public.habit_schedules(owner_id, habit_id, effective_from, effective_to);
create index if not exists habit_schedules_habit_id_idx on public.habit_schedules(habit_id);
create index if not exists habit_entries_owner_date_idx on public.habit_entries(owner_id, entry_date desc);
create index if not exists habit_entries_habit_id_idx on public.habit_entries(habit_id);
create index if not exists habit_entries_schedule_id_idx on public.habit_entries(schedule_id);

alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.habit_entries enable row level security;

revoke all on table public.habits, public.habit_schedules, public.habit_entries from anon, authenticated;
grant select, insert, update, delete on table public.habits, public.habit_schedules, public.habit_entries to authenticated;

create policy "habits_select_own" on public.habits for select to authenticated using ((select auth.uid()) = owner_id);
create policy "habits_insert_own" on public.habits for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "habits_update_own" on public.habits for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "habits_delete_own" on public.habits for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "habit_schedules_select_own" on public.habit_schedules for select to authenticated using ((select auth.uid()) = owner_id);
create policy "habit_schedules_insert_own" on public.habit_schedules for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "habit_schedules_update_own" on public.habit_schedules for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "habit_schedules_delete_own" on public.habit_schedules for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "habit_entries_select_own" on public.habit_entries for select to authenticated using ((select auth.uid()) = owner_id);
create policy "habit_entries_insert_own" on public.habit_entries for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "habit_entries_update_own" on public.habit_entries for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "habit_entries_delete_own" on public.habit_entries for delete to authenticated using ((select auth.uid()) = owner_id);
