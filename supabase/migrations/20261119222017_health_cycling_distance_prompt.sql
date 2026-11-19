alter table public.health_exercise_sessions
  add column if not exists distance_source text,
  add column if not exists distance_needs_input boolean not null default false,
  add column if not exists distance_manual_updated_at timestamptz,
  add column if not exists distance_conflict_km numeric(10,3)
    check (distance_conflict_km is null or distance_conflict_km > 0),
  add column if not exists distance_conflict_detected_at timestamptz;

alter table public.health_exercise_sessions
  drop constraint if exists health_exercise_sessions_distance_source_check;
alter table public.health_exercise_sessions
  add constraint health_exercise_sessions_distance_source_check
  check (distance_source is null or distance_source in ('health_connect','manual'));

update public.health_exercise_sessions
set distance_source=case when distance_km is not null and distance_km>0 then 'health_connect' else null end,
    distance_needs_input=case when deleted_at is null and is_cycling and exercise_type in (8,9) and distance_km is null then true else false end
where distance_source is null
   or distance_needs_input is distinct from (deleted_at is null and is_cycling and exercise_type in (8,9) and distance_km is null);

create index if not exists health_exercise_distance_needed
on public.health_exercise_sessions(owner_id,is_test,started_at desc)
where deleted_at is null and distance_needs_input;

create or replace function private.health_exercise_distance_state()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='UPDATE' and old.distance_source='manual' then
    if new.distance_source='manual'
       and new.distance_manual_updated_at is distinct from old.distance_manual_updated_at
       and new.distance_km is not null and new.distance_km>0 then
      new.distance_needs_input:=false;
    else
      if new.distance_km is not null
         and new.distance_km>0
         and new.distance_km is distinct from old.distance_km then
        new.distance_conflict_km:=new.distance_km;
        new.distance_conflict_detected_at:=now();
      end if;
      new.distance_km:=old.distance_km;
      new.distance_source:='manual';
      new.distance_manual_updated_at:=old.distance_manual_updated_at;
      new.distance_needs_input:=false;
    end if;
    return new;
  end if;

  if new.distance_source='manual' then
    if new.distance_km is null or new.distance_km<=0 then
      raise exception 'manual cycling distance must be positive' using errcode='22023';
    end if;
    new.distance_needs_input:=false;
    new.distance_manual_updated_at:=coalesce(new.distance_manual_updated_at,now());
  elsif new.distance_km is not null and new.distance_km>0 then
    new.distance_source:='health_connect';
    new.distance_needs_input:=false;
  else
    new.distance_source:=null;
    new.distance_needs_input:=new.deleted_at is null and new.is_cycling and new.exercise_type in (8,9);
  end if;
  return new;
end $$;

drop trigger if exists health_exercise_distance_state on public.health_exercise_sessions;
create trigger health_exercise_distance_state
before insert or update of distance_km,distance_source,distance_manual_updated_at,exercise_type,is_cycling,deleted_at
on public.health_exercise_sessions
for each row execute function private.health_exercise_distance_state();

comment on column public.health_exercise_sessions.distance_source is
  'health_connect for measured source distance, manual for bike-console distance entered in Fovyn.';
comment on column public.health_exercise_sessions.distance_needs_input is
  'True for Health Connect cycling types 8/9 with no available distance.';
comment on column public.health_exercise_sessions.distance_conflict_km is
  'A later Health Connect distance that differed from a preserved manual value.';
