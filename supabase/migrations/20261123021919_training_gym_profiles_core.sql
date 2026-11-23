-- Fovyn V1.8: additive movement families and gym profiles.
create table if not exists public.training_movement_families(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,name text not null,primary_muscle_group text,aliases text[] not null default '{}',notes text,archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,name));
alter table public.training_exercises add column if not exists movement_family_id uuid references public.training_movement_families(id) on delete set null;
alter table public.training_exercises add column if not exists variation_label text;
alter table public.training_exercises add column if not exists aliases text[] not null default '{}';
alter table public.training_exercises add column if not exists unilateral boolean not null default false;
alter table public.training_exercises add column if not exists movement_family_status text not null default 'review_required' check(movement_family_status in ('confirmed','review_required'));
create table if not exists public.training_gym_profiles(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,name text not null,notes text,equipment_photo_url text,archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists training_gym_profiles_owner_name_active on public.training_gym_profiles(owner_id,lower(name)) where archived_at is null;
create table if not exists public.training_gym_preferences(owner_id uuid primary key references auth.users(id) on delete cascade,selected_gym_id uuid references public.training_gym_profiles(id) on delete set null,updated_at timestamptz not null default now());
alter table public.training_movement_families enable row level security;alter table public.training_gym_profiles enable row level security;alter table public.training_gym_preferences enable row level security;
create policy training_movement_families_owner_all on public.training_movement_families for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy training_gym_profiles_owner_all on public.training_gym_profiles for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy training_gym_preferences_owner_all on public.training_gym_preferences for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());