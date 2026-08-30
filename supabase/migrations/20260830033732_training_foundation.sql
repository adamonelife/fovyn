create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Makassar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  exercise_key text not null,
  name text not null,
  muscle_group text not null,
  equipment text,
  default_sets smallint not null default 1 check (default_sets > 0),
  min_target numeric,
  max_target numeric,
  increment_kg numeric not null default 0,
  measurement_type text not null default 'Reps',
  progression_type text not null default 'Fixed',
  active boolean not null default true,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, exercise_key)
);

create table if not exists public.training_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  rule_key text not null,
  exercise_id uuid not null references public.training_exercises(id) on delete cascade,
  rule_type text not null,
  condition_text text,
  action_text text,
  active boolean not null default true,
  source_payload jsonb,
  unique (owner_id, rule_key)
);

create table if not exists public.training_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workout_type text not null,
  variant text not null,
  active boolean not null default true,
  unique (owner_id, workout_type, variant)
);

create table if not exists public.training_template_slots (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.training_templates(id) on delete cascade,
  position smallint not null,
  slot_name text not null,
  muscle_group text not null,
  default_exercise_id uuid not null references public.training_exercises(id),
  required boolean not null default true,
  source_payload jsonb,
  unique (template_id, position, slot_name)
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  legacy_session_id integer,
  performed_on date not null,
  workout_type text not null,
  variant text not null,
  bodyweight_kg numeric,
  duration_min numeric,
  watch_calories numeric,
  energy numeric,
  sleep_hours numeric,
  notes text,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, legacy_session_id, performed_on, workout_type, variant)
);

create table if not exists public.training_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  exercise_id uuid not null references public.training_exercises(id),
  position smallint,
  slot_name text,
  exercise_name_snapshot text not null,
  rpe numeric,
  notes text,
  source_payload jsonb,
  unique nulls not distinct (session_id, exercise_id, position, slot_name)
);

create table if not exists public.training_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.training_session_exercises(id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  load_kg numeric,
  load_label text,
  target_value numeric,
  completed boolean not null default true,
  unique (session_exercise_id, set_number)
);

create table if not exists public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  legacy_cardio_id text,
  performed_on date not null,
  activity text not null,
  duration_min numeric not null,
  watch_calories numeric,
  distance_km numeric,
  average_hr numeric,
  notes text,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, legacy_cardio_id, performed_on, activity)
);

create index if not exists training_sessions_owner_date_idx on public.training_sessions(owner_id, performed_on desc);
create index if not exists session_exercises_session_idx on public.training_session_exercises(session_id, position);
create index if not exists cardio_entries_owner_date_idx on public.cardio_entries(owner_id, performed_on desc);

alter table public.profiles enable row level security;
alter table public.training_exercises enable row level security;
alter table public.training_rules enable row level security;
alter table public.training_templates enable row level security;
alter table public.training_template_slots enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_exercises enable row level security;
alter table public.training_sets enable row level security;
alter table public.cardio_entries enable row level security;

revoke all on table public.profiles, public.training_exercises, public.training_rules,
  public.training_templates, public.training_template_slots, public.training_sessions,
  public.training_session_exercises, public.training_sets, public.cardio_entries from anon, authenticated;

grant select, insert, update, delete on table public.profiles, public.training_exercises,
  public.training_rules, public.training_templates, public.training_template_slots,
  public.training_sessions, public.training_session_exercises, public.training_sets,
  public.cardio_entries to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "exercises_select_own" on public.training_exercises for select to authenticated using ((select auth.uid()) = owner_id);
create policy "exercises_insert_own" on public.training_exercises for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "exercises_update_own" on public.training_exercises for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "exercises_delete_own" on public.training_exercises for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "rules_select_own" on public.training_rules for select to authenticated using ((select auth.uid()) = owner_id);
create policy "rules_insert_own" on public.training_rules for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "rules_update_own" on public.training_rules for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "rules_delete_own" on public.training_rules for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "templates_select_own" on public.training_templates for select to authenticated using ((select auth.uid()) = owner_id);
create policy "templates_insert_own" on public.training_templates for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "templates_update_own" on public.training_templates for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "templates_delete_own" on public.training_templates for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "template_slots_select_own" on public.training_template_slots for select to authenticated
  using (exists (select 1 from public.training_templates t where t.id = template_id and t.owner_id = (select auth.uid())));
create policy "template_slots_insert_own" on public.training_template_slots for insert to authenticated
  with check (exists (select 1 from public.training_templates t where t.id = template_id and t.owner_id = (select auth.uid())));
create policy "template_slots_update_own" on public.training_template_slots for update to authenticated
  using (exists (select 1 from public.training_templates t where t.id = template_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.training_templates t where t.id = template_id and t.owner_id = (select auth.uid())));
create policy "template_slots_delete_own" on public.training_template_slots for delete to authenticated
  using (exists (select 1 from public.training_templates t where t.id = template_id and t.owner_id = (select auth.uid())));

create policy "sessions_select_own" on public.training_sessions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "sessions_insert_own" on public.training_sessions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "sessions_update_own" on public.training_sessions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "sessions_delete_own" on public.training_sessions for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "session_exercises_select_own" on public.training_session_exercises for select to authenticated
  using (exists (select 1 from public.training_sessions s where s.id = session_id and s.owner_id = (select auth.uid())));
create policy "session_exercises_insert_own" on public.training_session_exercises for insert to authenticated
  with check (exists (select 1 from public.training_sessions s where s.id = session_id and s.owner_id = (select auth.uid())));
create policy "session_exercises_update_own" on public.training_session_exercises for update to authenticated
  using (exists (select 1 from public.training_sessions s where s.id = session_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.training_sessions s where s.id = session_id and s.owner_id = (select auth.uid())));
create policy "session_exercises_delete_own" on public.training_session_exercises for delete to authenticated
  using (exists (select 1 from public.training_sessions s where s.id = session_id and s.owner_id = (select auth.uid())));

create policy "sets_select_own" on public.training_sets for select to authenticated
  using (exists (select 1 from public.training_session_exercises se join public.training_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.owner_id = (select auth.uid())));
create policy "sets_insert_own" on public.training_sets for insert to authenticated
  with check (exists (select 1 from public.training_session_exercises se join public.training_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.owner_id = (select auth.uid())));
create policy "sets_update_own" on public.training_sets for update to authenticated
  using (exists (select 1 from public.training_session_exercises se join public.training_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.training_session_exercises se join public.training_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.owner_id = (select auth.uid())));
create policy "sets_delete_own" on public.training_sets for delete to authenticated
  using (exists (select 1 from public.training_session_exercises se join public.training_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.owner_id = (select auth.uid())));

create policy "cardio_select_own" on public.cardio_entries for select to authenticated using ((select auth.uid()) = owner_id);
create policy "cardio_insert_own" on public.cardio_entries for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "cardio_update_own" on public.cardio_entries for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "cardio_delete_own" on public.cardio_entries for delete to authenticated using ((select auth.uid()) = owner_id);
