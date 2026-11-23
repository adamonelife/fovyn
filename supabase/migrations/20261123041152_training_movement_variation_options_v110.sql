-- Fovyn V1.10: movement-family-first variation catalogue.
-- Additive only. Existing exercises, histories, templates and identifiers are unchanged.

create table if not exists public.training_movement_variation_options (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  movement_family_id uuid not null references public.training_movement_families(id) on delete cascade,
  variation_key text not null,
  label text not null,
  equipment text,
  resistance_type text,
  unilateral boolean not null default false,
  weight_convention text,
  sort_order integer not null default 100,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, movement_family_id, variation_key)
);

create index if not exists training_movement_variation_options_owner_family_idx
  on public.training_movement_variation_options(owner_id, movement_family_id)
  where archived_at is null;

alter table public.training_movement_variation_options enable row level security;

drop policy if exists "Owners can view movement variation options" on public.training_movement_variation_options;
create policy "Owners can view movement variation options"
  on public.training_movement_variation_options for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can create movement variation options" on public.training_movement_variation_options;
create policy "Owners can create movement variation options"
  on public.training_movement_variation_options for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.training_movement_families f
      where f.id = movement_family_id and f.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update movement variation options" on public.training_movement_variation_options;
create policy "Owners can update movement variation options"
  on public.training_movement_variation_options for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete movement variation options" on public.training_movement_variation_options;
create policy "Owners can delete movement variation options"
  on public.training_movement_variation_options for delete
  using (auth.uid() = owner_id);

with press_options(variation_key, label, equipment, resistance_type, unilateral, weight_convention, sort_order) as (
  values
    ('barbell', 'Barbell', 'Barbell', 'free_weight', false, 'total_load', 10),
    ('dumbbell', 'Dumbbell', 'Dumbbell', 'free_weight', false, 'per_hand', 20),
    ('smith-machine', 'Smith Machine', 'Smith Machine', 'machine', false, 'total_load', 30),
    ('machine-two-arm', 'Machine — Two-Arm', 'Machine', 'machine', false, 'machine_stack', 40),
    ('machine-single-arm', 'Machine — Single-Arm', 'Machine', 'machine', true, 'per_side', 50),
    ('cable', 'Cable', 'Cable', 'cable', false, 'machine_stack', 60)
)
insert into public.training_movement_variation_options
  (owner_id, movement_family_id, variation_key, label, equipment, resistance_type, unilateral, weight_convention, sort_order)
select f.owner_id, f.id, o.variation_key, o.label, o.equipment, o.resistance_type, o.unilateral, o.weight_convention, o.sort_order
from public.training_movement_families f
cross join press_options o
where f.name in ('Incline Chest Press', 'Flat Chest Press')
on conflict (owner_id, movement_family_id, variation_key) do update
set label = excluded.label,
    equipment = excluded.equipment,
    resistance_type = excluded.resistance_type,
    unilateral = excluded.unilateral,
    weight_convention = excluded.weight_convention,
    sort_order = excluded.sort_order,
    archived_at = null,
    updated_at = now();

with standard_options(family_name, variation_key, label, unilateral, sort_order) as (
  values
    ('Decline Chest Press', 'standard', 'Standard', false, 10),
    ('Shoulder Press', 'standard', 'Standard', false, 10),
    ('Chest Fly', 'standard', 'Standard', false, 10),
    ('Seated Row', 'standard', 'Standard', false, 10),
    ('Lat Pulldown', 'standard', 'Standard', false, 10),
    ('Lateral Raise', 'standard', 'Standard', false, 10),
    ('Lateral Raise', 'single-arm', 'Single-Arm', true, 20),
    ('Biceps Curl', 'standard', 'Standard', false, 10),
    ('Biceps Curl', 'single-arm', 'Single-Arm', true, 20),
    ('Triceps Pushdown', 'standard', 'Standard', false, 10),
    ('Triceps Pushdown', 'single-arm', 'Single-Arm', true, 20),
    ('Leg Press', 'standard', 'Standard', false, 10),
    ('Squat', 'standard', 'Standard', false, 10),
    ('Leg Extension', 'standard', 'Standard', false, 10),
    ('Leg Curl', 'standard', 'Standard', false, 10),
    ('Hip Thrust', 'standard', 'Standard', false, 10),
    ('Glute Bridge', 'standard', 'Standard Glute Bridge', false, 10),
    ('Glute Bridge', 'single-leg', 'Single-Leg', true, 20),
    ('Side Plank', 'knees', 'Knees', false, 10),
    ('Side Plank', 'full', 'Full', false, 20),
    ('Bird Dog', 'modified', 'Modified', false, 10),
    ('Bird Dog', 'full', 'Full', false, 20)
)
insert into public.training_movement_variation_options
  (owner_id, movement_family_id, variation_key, label, unilateral, sort_order)
select f.owner_id, f.id, o.variation_key, o.label, o.unilateral, o.sort_order
from public.training_movement_families f
join standard_options o on o.family_name = f.name
on conflict (owner_id, movement_family_id, variation_key) do nothing;
