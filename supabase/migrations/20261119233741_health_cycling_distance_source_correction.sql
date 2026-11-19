create or replace function private.health_cycling_distance_plausible(
  p_distance_km numeric,
  p_duration_minutes numeric
)
returns boolean
language sql
immutable
security invoker
set search_path=''
as $$
  select p_distance_km is not null
     and p_distance_km > 0
     and (
       p_duration_minutes is null
       or p_duration_minutes <= 0
       or p_distance_km / (p_duration_minutes / 60.0) >= 2.0
     )
$$;

create or replace function private.health_exercise_distance_state()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  cycling_session boolean;
  plausible_distance boolean;
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

  cycling_session:=new.deleted_at is null and new.is_cycling and new.exercise_type in (8,9);
  plausible_distance:=private.health_cycling_distance_plausible(new.distance_km,new.duration_minutes);

  if new.distance_source='manual' then
    if new.distance_km is null or new.distance_km<=0 then
      raise exception 'manual cycling distance must be positive' using errcode='22023';
    end if;
    new.distance_needs_input:=false;
    new.distance_manual_updated_at:=coalesce(new.distance_manual_updated_at,now());
  elsif new.distance_km is not null and new.distance_km>0 then
    new.distance_source:='health_connect';
    new.distance_needs_input:=cycling_session and not plausible_distance;
  else
    new.distance_source:=null;
    new.distance_needs_input:=cycling_session;
  end if;
  return new;
end $$;

update public.health_exercise_sessions
set distance_needs_input=
  deleted_at is null
  and is_cycling
  and exercise_type in (8,9)
  and not private.health_cycling_distance_plausible(distance_km,duration_minutes)
where distance_source is distinct from 'manual'
  and distance_needs_input is distinct from (
    deleted_at is null
    and is_cycling
    and exercise_type in (8,9)
    and not private.health_cycling_distance_plausible(distance_km,duration_minutes)
  );

comment on column public.health_exercise_sessions.distance_needs_input is
  'True for Health Connect cycling types 8/9 with missing or implausibly low overlapping distance; manual distance clears the prompt.';
