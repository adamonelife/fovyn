alter table public.training_exercises
  add column if not exists secondary_muscle_group text,
  add column if not exists notes text,
  add column if not exists resistance_type text,
  add column if not exists minimum_weight numeric,
  add column if not exists maximum_weight numeric,
  add column if not exists available_weights numeric[],
  add column if not exists weight_convention text,
  add column if not exists archived_at timestamptz;

alter table public.training_exercises drop constraint if exists training_exercises_resistance_type_check;
alter table public.training_exercises add constraint training_exercises_resistance_type_check check (resistance_type is null or resistance_type in ('machine','cable','dumbbell','barbell','plate_loaded','smith_machine','bodyweight','assisted_bodyweight','cardio_machine','other'));
alter table public.training_exercises drop constraint if exists training_exercises_weight_convention_check;
alter table public.training_exercises add constraint training_exercises_weight_convention_check check (weight_convention is null or weight_convention in ('total_weight','per_hand','per_side','bodyweight_only','bodyweight_added','bodyweight_assistance'));
alter table public.training_exercises drop constraint if exists training_exercises_weight_bounds_check;
alter table public.training_exercises add constraint training_exercises_weight_bounds_check check ((minimum_weight is null or minimum_weight>=0) and (maximum_weight is null or maximum_weight>=0) and (minimum_weight is null or maximum_weight is null or minimum_weight<=maximum_weight));

create table if not exists public.training_exercise_configurations(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.training_exercises(id) on delete cascade,
  effective_from timestamptz not null default now(),
  configuration jsonb not null
);
alter table public.training_exercise_configurations enable row level security;
grant select,insert on public.training_exercise_configurations to authenticated;
drop policy if exists "exercise_configurations_select_own" on public.training_exercise_configurations;
create policy "exercise_configurations_select_own" on public.training_exercise_configurations for select to authenticated using ((select auth.uid())=owner_id);
drop policy if exists "exercise_configurations_insert_own" on public.training_exercise_configurations;
create policy "exercise_configurations_insert_own" on public.training_exercise_configurations for insert to authenticated with check ((select auth.uid())=owner_id and exists(select 1 from public.training_exercises e where e.id=exercise_id and e.owner_id=(select auth.uid())));
create index if not exists training_exercise_configurations_owner_exercise_idx on public.training_exercise_configurations(owner_id,exercise_id,effective_from desc);
create index if not exists training_exercise_configurations_exercise_idx on public.training_exercise_configurations(exercise_id);

insert into public.training_exercise_configurations(owner_id,exercise_id,effective_from,configuration)
select owner_id,id,created_at,jsonb_build_object('name',name,'muscle_group',muscle_group,'equipment',equipment,'default_sets',default_sets,'min_target',min_target,'max_target',max_target,'increment_kg',increment_kg,'measurement_type',measurement_type,'progression_type',progression_type,'active',active)
from public.training_exercises e
where not exists(select 1 from public.training_exercise_configurations c where c.exercise_id=e.id);

create or replace function public.snapshot_training_exercise_configuration()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.training_exercise_configurations(owner_id,exercise_id,effective_from,configuration)
    values(new.owner_id,new.id,now(),to_jsonb(new)-'source_payload');
    return new;
  end if;
  if row(old.name,old.muscle_group,old.secondary_muscle_group,old.equipment,old.resistance_type,old.default_sets,old.min_target,old.max_target,old.increment_kg,old.minimum_weight,old.maximum_weight,old.available_weights,old.weight_convention,old.measurement_type,old.progression_type,old.notes,old.active,old.archived_at)
    is distinct from row(new.name,new.muscle_group,new.secondary_muscle_group,new.equipment,new.resistance_type,new.default_sets,new.min_target,new.max_target,new.increment_kg,new.minimum_weight,new.maximum_weight,new.available_weights,new.weight_convention,new.measurement_type,new.progression_type,new.notes,new.active,new.archived_at) then
    insert into public.training_exercise_configurations(owner_id,exercise_id,effective_from,configuration)
    values(old.owner_id,old.id,now(),to_jsonb(old)-'source_payload');
  end if;
  return new;
end;$$;
drop trigger if exists snapshot_training_exercise_configuration on public.training_exercises;
create trigger snapshot_training_exercise_configuration before update on public.training_exercises for each row execute function public.snapshot_training_exercise_configuration();
drop trigger if exists snapshot_new_training_exercise_configuration on public.training_exercises;
create trigger snapshot_new_training_exercise_configuration after insert on public.training_exercises for each row execute function public.snapshot_training_exercise_configuration();
revoke execute on function public.snapshot_training_exercise_configuration() from public,anon,authenticated;
