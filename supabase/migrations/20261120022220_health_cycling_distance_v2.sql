create or replace function private.cycling_equivalent_steps_v2(p_distance_km numeric)
returns integer language sql immutable security invoker set search_path=''
as $$ select case when p_distance_km is null or p_distance_km<=0 then 0 else round(p_distance_km*5000.0/6.0)::integer end $$;

create or replace function private.health_exercise_distance_state()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare cycling_session boolean; plausible_distance boolean; use_distance boolean; effective_duration numeric;
begin
  cycling_session:=new.deleted_at is null and new.is_cycling and new.exercise_type in (8,9);
  if tg_op='UPDATE' and old.distance_source='manual' then
    if new.distance_source='manual' and new.distance_manual_updated_at is distinct from old.distance_manual_updated_at
       and new.distance_km is not null and new.distance_km>0 then
      new.distance_needs_input:=false;
    else
      if new.distance_km is not null and new.distance_km>0 and new.distance_km is distinct from old.distance_km then
        new.distance_conflict_km:=new.distance_km; new.distance_conflict_detected_at:=now();
      end if;
      new.distance_km:=old.distance_km; new.distance_source:='manual';
      new.distance_manual_updated_at:=old.distance_manual_updated_at; new.distance_needs_input:=false;
    end if;
  else
    plausible_distance:=private.health_cycling_distance_plausible(new.distance_km,new.duration_minutes);
    if new.distance_source='manual' then
      if new.distance_km is null or new.distance_km<=0 then raise exception 'manual cycling distance must be positive' using errcode='22023'; end if;
      new.distance_needs_input:=false; new.distance_manual_updated_at:=coalesce(new.distance_manual_updated_at,now());
    elsif new.distance_km is not null and new.distance_km>0 then
      new.distance_source:='health_connect'; new.distance_needs_input:=cycling_session and not plausible_distance;
    else
      new.distance_source:=null; new.distance_needs_input:=cycling_session;
    end if;
  end if;
  if new.is_cycling then
    use_distance:=new.distance_km is not null and new.distance_km>0 and (new.exercise_type=9 or new.distance_source='manual');
    effective_duration:=coalesce(new.active_duration_minutes,new.duration_minutes);
    if use_distance then
      new.cycling_equivalent_steps:=private.cycling_equivalent_steps_v2(new.distance_km); new.formula_version:='cycle-distance-v2';
    elsif new.exercise_type=9 and effective_duration is not null and effective_duration>0 then
      new.cycling_equivalent_steps:=private.cycling_equivalent_steps_v1(effective_duration,new.active_calories); new.formula_version:='cycle-duration-intensity-v1';
    else
      new.cycling_equivalent_steps:=0; new.formula_version:=null;
    end if;
  end if;
  return new;
end $$;

create or replace function private.health_exercise_duration_state()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare effective_duration numeric; use_distance boolean;
begin
  if tg_op='UPDATE' and old.active_duration_source='manual' then
    if new.active_duration_source='manual' and new.active_duration_manual_updated_at is distinct from old.active_duration_manual_updated_at
       and new.active_duration_minutes is not null and new.active_duration_minutes>0 then null;
    else
      if new.active_duration_minutes is not null and new.active_duration_minutes>0
         and new.active_duration_minutes is distinct from old.active_duration_minutes then
        new.active_duration_conflict_minutes:=new.active_duration_minutes; new.active_duration_conflict_detected_at:=now();
      end if;
      new.active_duration_minutes:=old.active_duration_minutes; new.active_duration_source:='manual';
      new.active_duration_manual_updated_at:=old.active_duration_manual_updated_at;
    end if;
  elsif new.active_duration_source='manual' then
    if new.active_duration_minutes is null or new.active_duration_minutes<=0 then raise exception 'manual active duration must be positive' using errcode='22023'; end if;
    new.active_duration_manual_updated_at:=coalesce(new.active_duration_manual_updated_at,now());
  elsif new.active_duration_minutes is not null and new.active_duration_minutes>0 then
    new.active_duration_source:=case when new.active_duration_source='health_connect' then 'health_connect' else 'elapsed' end;
  else
    new.active_duration_minutes:=new.duration_minutes; new.active_duration_source:='elapsed';
  end if;
  if new.is_cycling then
    effective_duration:=coalesce(new.active_duration_minutes,new.duration_minutes);
    use_distance:=new.distance_km is not null and new.distance_km>0 and (new.exercise_type=9 or new.distance_source='manual');
    if use_distance then
      new.cycling_equivalent_steps:=private.cycling_equivalent_steps_v2(new.distance_km); new.formula_version:='cycle-distance-v2';
    elsif new.exercise_type=9 and effective_duration is not null and effective_duration>0 then
      new.cycling_equivalent_steps:=private.cycling_equivalent_steps_v1(effective_duration,new.active_calories); new.formula_version:='cycle-duration-intensity-v1';
    else
      new.cycling_equivalent_steps:=0; new.formula_version:=null;
    end if;
  end if;
  return new;
end $$;

create or replace function private.health_refresh_cycling_daily()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_owner uuid:=coalesce(new.owner_id,old.owner_id); v_is_test boolean:=coalesce(new.is_test,old.is_test); v_date date:=coalesce(new.local_date,old.local_date);
begin
  update public.health_daily_summaries d
  set cycling_equivalent_steps=coalesce((select sum(e.cycling_equivalent_steps)::integer from public.health_exercise_sessions e
      where e.owner_id=v_owner and e.is_test=v_is_test and e.local_date=v_date and e.deleted_at is null and e.is_cycling),0),
      formula_version=case when exists(select 1 from public.health_exercise_sessions e where e.owner_id=v_owner and e.is_test=v_is_test
        and e.local_date=v_date and e.deleted_at is null and e.is_cycling and e.formula_version='cycle-distance-v2')
        then 'cycle-distance-v2' else d.formula_version end, updated_at=now()
  where d.owner_id=v_owner and d.is_test=v_is_test and d.local_date=v_date;
  return coalesce(new,old);
end $$;

drop trigger if exists health_refresh_cycling_daily on public.health_exercise_sessions;
create trigger health_refresh_cycling_daily
after insert or update of cycling_equivalent_steps,distance_km,distance_source,active_duration_minutes,deleted_at or delete
on public.health_exercise_sessions for each row execute function private.health_refresh_cycling_daily();

update public.health_exercise_sessions
set distance_km=5.670,distance_source='manual',distance_needs_input=false,distance_manual_updated_at=now(),updated_at=now()
where is_test=false and provider='health_connect' and source_record_id='7d967f81-151a-4137-899b-f875ab4b8115';

update public.health_exercise_sessions
set cycling_equivalent_steps=case
      when distance_km is not null and distance_km>0 and (exercise_type=9 or distance_source='manual') then private.cycling_equivalent_steps_v2(distance_km)
      when exercise_type=9 and coalesce(active_duration_minutes,duration_minutes)>0 then private.cycling_equivalent_steps_v1(coalesce(active_duration_minutes,duration_minutes),active_calories)
      else 0 end,
    formula_version=case
      when distance_km is not null and distance_km>0 and (exercise_type=9 or distance_source='manual') then 'cycle-distance-v2'
      when exercise_type=9 and coalesce(active_duration_minutes,duration_minutes)>0 then 'cycle-duration-intensity-v1'
      else null end,updated_at=now()
where is_cycling and deleted_at is null;

update public.health_daily_summaries d
set cycling_equivalent_steps=coalesce((select sum(e.cycling_equivalent_steps)::integer from public.health_exercise_sessions e
      where e.owner_id=d.owner_id and e.is_test=d.is_test and e.local_date=d.local_date and e.deleted_at is null and e.is_cycling),0),
    formula_version=case when exists(select 1 from public.health_exercise_sessions e where e.owner_id=d.owner_id and e.is_test=d.is_test
      and e.local_date=d.local_date and e.deleted_at is null and e.is_cycling and e.formula_version='cycle-distance-v2')
      then 'cycle-distance-v2' else d.formula_version end,updated_at=now()
where exists(select 1 from public.health_exercise_sessions e where e.owner_id=d.owner_id and e.is_test=d.is_test and e.local_date=d.local_date and e.is_cycling);

comment on function private.cycling_equivalent_steps_v2(numeric) is
  'Personal activity-goal conversion: stationary cycling distance in km times 5000/6, rounded to a whole estimated step.';
comment on column public.health_exercise_sessions.formula_version is
  'Versioned cycling activity-credit calculation. cycle-distance-v2 uses verified/manual stationary-bike distance; cycle-duration-intensity-v1 is provisional.';
