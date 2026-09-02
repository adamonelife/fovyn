alter table public.training_templates
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.training_templates
set name = btrim(concat_ws(' ', nullif(workout_type, ''), nullif(variant, '')))
where name is null or btrim(name) = '';

alter table public.training_templates alter column name set not null;
alter table public.training_templates drop constraint if exists training_templates_name_check;
alter table public.training_templates add constraint training_templates_name_check check (char_length(btrim(name)) between 1 and 120);
alter table public.training_templates drop constraint if exists training_templates_description_check;
alter table public.training_templates add constraint training_templates_description_check check (description is null or char_length(description) <= 500);
create unique index if not exists training_templates_owner_name_active_idx
  on public.training_templates(owner_id, lower(btrim(name))) where archived_at is null;

alter table public.training_templates drop constraint if exists training_templates_id_owner_key;
alter table public.training_templates add constraint training_templates_id_owner_key unique(id,owner_id);
alter table public.training_sessions add column if not exists template_id uuid;
alter table public.training_sessions drop constraint if exists training_sessions_template_id_fkey;
alter table public.training_sessions drop constraint if exists training_sessions_template_owner_fkey;
alter table public.training_sessions add constraint training_sessions_template_owner_fkey foreign key(template_id,owner_id) references public.training_templates(id,owner_id) on delete set null(template_id);
create index if not exists training_sessions_template_id_idx on public.training_sessions(template_id);

drop policy if exists "template_slots_insert_own" on public.training_template_slots;
create policy "template_slots_insert_own" on public.training_template_slots for insert to authenticated with check (
  exists(select 1 from public.training_templates t where t.id=template_id and t.owner_id=(select auth.uid()))
  and exists(select 1 from public.training_exercises e where e.id=default_exercise_id and e.owner_id=(select auth.uid()))
);
drop policy if exists "template_slots_update_own" on public.training_template_slots;
create policy "template_slots_update_own" on public.training_template_slots for update to authenticated
using (exists(select 1 from public.training_templates t where t.id=template_id and t.owner_id=(select auth.uid())))
with check (
  exists(select 1 from public.training_templates t where t.id=template_id and t.owner_id=(select auth.uid()))
  and exists(select 1 from public.training_exercises e where e.id=default_exercise_id and e.owner_id=(select auth.uid()))
);

update public.training_exercises set muscle_group = case
  when muscle_group in ('Fly','Decline Press','Flat Press','Incline Press') then 'chest'
  when muscle_group in ('Horizontal Row','Archer Row','Vertical Pull','Lat Isolation','Shrugs','Lower Back') then 'back'
  when muscle_group in ('Shoulder Press','Lat Raise','R Delts') then 'shoulders'
  when muscle_group = 'Biceps' then 'biceps'
  when muscle_group = 'Triceps' then 'triceps'
  when muscle_group in ('Squat','Leg Press','Single Leg') then 'quadriceps'
  when muscle_group = 'Hamstrings' then 'hamstrings'
  when muscle_group in ('Hips','Hip Hinge') then 'glutes'
  when muscle_group = 'Calves' then 'calves'
  when muscle_group = 'Core' then 'core'
  when muscle_group in ('Balance','Carry') then 'full_body'
  when muscle_group = 'Cardio' then 'cardio'
  else 'other'
end
where muscle_group not in ('chest','back','shoulders','biceps','triceps','forearms','quadriceps','hamstrings','glutes','calves','core','full_body','cardio','other');

update public.training_exercises set secondary_muscle_group = null
where secondary_muscle_group is not null
  and secondary_muscle_group not in ('chest','back','shoulders','biceps','triceps','forearms','quadriceps','hamstrings','glutes','calves','core','full_body','cardio','other');

alter table public.training_exercises drop constraint if exists training_exercises_muscle_group_check;
alter table public.training_exercises add constraint training_exercises_muscle_group_check check (muscle_group in ('chest','back','shoulders','biceps','triceps','forearms','quadriceps','hamstrings','glutes','calves','core','full_body','cardio','other'));
alter table public.training_exercises drop constraint if exists training_exercises_secondary_muscle_group_check;
alter table public.training_exercises add constraint training_exercises_secondary_muscle_group_check check (secondary_muscle_group is null or (secondary_muscle_group in ('chest','back','shoulders','biceps','triceps','forearms','quadriceps','hamstrings','glutes','calves','core','full_body','cardio','other') and secondary_muscle_group <> muscle_group));

create or replace function public.save_training_template(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_slots jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_template_id uuid := p_template_id;
  v_slot jsonb;
  v_exercise_id uuid;
  v_position integer := 0;
begin
  if v_owner is null then raise exception 'Sign in to manage Training templates'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then raise exception 'Template name is required'; end if;
  if p_description is not null and char_length(p_description) > 500 then raise exception 'Template description is too long'; end if;
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 then raise exception 'Add at least one exercise'; end if;

  if v_template_id is null then
    insert into public.training_templates(owner_id, workout_type, variant, name, description, active)
    values(v_owner, btrim(p_name), 'Custom', btrim(p_name), nullif(btrim(p_description), ''), true)
    returning id into v_template_id;
  else
    update public.training_templates
    set name=btrim(p_name), workout_type=btrim(p_name), variant='Custom', description=nullif(btrim(p_description), ''), active=true, archived_at=null, updated_at=now()
    where id=v_template_id and owner_id=v_owner;
    if not found then raise exception 'Training template not found'; end if;
    delete from public.training_template_slots where template_id=v_template_id;
  end if;

  for v_slot in select value from jsonb_array_elements(p_slots) loop
    v_position := v_position + 1;
    v_exercise_id := (v_slot->>'exercise_id')::uuid;
    if not exists(select 1 from public.training_exercises where id=v_exercise_id and owner_id=v_owner and active) then
      raise exception 'A selected exercise is unavailable';
    end if;
    insert into public.training_template_slots(template_id, position, slot_name, muscle_group, default_exercise_id, required)
    select v_template_id, v_position, coalesce(nullif(v_slot->>'slot_name',''), name), muscle_group, id, coalesce((v_slot->>'required')::boolean,true)
    from public.training_exercises where id=v_exercise_id and owner_id=v_owner;
  end loop;
  return v_template_id;
end;
$$;

revoke execute on function public.save_training_template(uuid,text,text,jsonb) from public, anon;
grant execute on function public.save_training_template(uuid,text,text,jsonb) to authenticated;
