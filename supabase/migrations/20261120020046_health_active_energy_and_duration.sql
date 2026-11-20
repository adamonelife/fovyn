alter table public.health_exercise_sessions
  add column if not exists active_duration_minutes numeric(10,2)
    check (active_duration_minutes is null or active_duration_minutes > 0),
  add column if not exists active_duration_source text,
  add column if not exists active_duration_manual_updated_at timestamptz,
  add column if not exists active_duration_conflict_minutes numeric(10,2)
    check (active_duration_conflict_minutes is null or active_duration_conflict_minutes > 0),
  add column if not exists active_duration_conflict_detected_at timestamptz;

alter table public.health_exercise_sessions
  drop constraint if exists health_exercise_active_duration_source_check;
alter table public.health_exercise_sessions
  add constraint health_exercise_active_duration_source_check
  check (active_duration_source is null or active_duration_source in ('elapsed','health_connect','manual'));

alter table public.health_daily_summaries
  add column if not exists total_calories numeric(10,2)
    check (total_calories is null or total_calories between 0 and 50000),
  add column if not exists total_calorie_source text;

create or replace function private.health_exercise_duration_state()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  effective_duration numeric;
begin
  if tg_op='UPDATE' and old.active_duration_source='manual' then
    if new.active_duration_source='manual'
       and new.active_duration_manual_updated_at is distinct from old.active_duration_manual_updated_at
       and new.active_duration_minutes is not null
       and new.active_duration_minutes>0 then
      null;
    else
      if new.active_duration_minutes is not null
         and new.active_duration_minutes>0
         and new.active_duration_minutes is distinct from old.active_duration_minutes then
        new.active_duration_conflict_minutes:=new.active_duration_minutes;
        new.active_duration_conflict_detected_at:=now();
      end if;
      new.active_duration_minutes:=old.active_duration_minutes;
      new.active_duration_source:='manual';
      new.active_duration_manual_updated_at:=old.active_duration_manual_updated_at;
    end if;
  elsif new.active_duration_source='manual' then
    if new.active_duration_minutes is null or new.active_duration_minutes<=0 then
      raise exception 'manual active duration must be positive' using errcode='22023';
    end if;
    new.active_duration_manual_updated_at:=coalesce(new.active_duration_manual_updated_at,now());
  elsif new.active_duration_minutes is not null and new.active_duration_minutes>0 then
    new.active_duration_source:=case when new.active_duration_source='health_connect' then 'health_connect' else 'elapsed' end;
  else
    new.active_duration_minutes:=new.duration_minutes;
    new.active_duration_source:='elapsed';
  end if;

  effective_duration:=coalesce(new.active_duration_minutes,new.duration_minutes);
  if new.is_cycling then
    new.cycling_equivalent_steps:=private.cycling_equivalent_steps_v1(effective_duration,new.active_calories);
    new.formula_version:='cycle-duration-intensity-v1';
  end if;
  return new;
end $$;

drop trigger if exists health_exercise_duration_state on public.health_exercise_sessions;
create trigger health_exercise_duration_state
before insert or update of duration_minutes,active_duration_minutes,active_duration_source,
  active_duration_manual_updated_at,active_calories,is_cycling,cycling_equivalent_steps
on public.health_exercise_sessions
for each row execute function private.health_exercise_duration_state();

update public.health_exercise_sessions
set active_duration_minutes=duration_minutes,
    active_duration_source='elapsed'
where active_duration_source is null;

update public.health_exercise_sessions
set active_duration_minutes=13.083333,
    active_duration_source='manual',
    active_duration_manual_updated_at=now()
where is_test=false
  and provider='health_connect'
  and source_record_id='7d967f81-151a-4137-899b-f875ab4b8115';

update public.health_daily_summaries d
set cycling_equivalent_steps=coalesce((
      select sum(e.cycling_equivalent_steps)::integer
      from public.health_exercise_sessions e
      where e.owner_id=d.owner_id and e.is_test=d.is_test
        and e.local_date=d.local_date and e.deleted_at is null and e.is_cycling
    ),0),
    updated_at=now()
where exists(
  select 1 from public.health_exercise_sessions e
  where e.owner_id=d.owner_id and e.is_test=d.is_test and e.local_date=d.local_date and e.is_cycling
);

create or replace function public.health_finalize_sync(
  p_owner uuid,
  p_payload jsonb,
  p_is_test boolean,
  p_ingest_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_now timestamptz:=now();
  v_fingerprint text:=left(coalesce(p_payload->>'snapshot_fingerprint',''),128);
  v_previous text;
  v_status text;
  v_counts jsonb;
begin
  if p_owner is null or not exists(select 1 from auth.users where id=p_owner) then
    raise exception 'invalid_owner' using errcode='22023';
  end if;

  select snapshot_fingerprint into v_previous
  from public.health_connections
  where owner_id=p_owner and is_test=p_is_test and device_id=left(p_payload->>'device_id',200);

  update public.health_exercise_sessions h
  set workout_calories=nullif(x.value->>'workout_calories','')::numeric,
      workout_calorie_source=nullif(x.value->>'workout_calorie_source',''),
      active_duration_minutes=coalesce(nullif(x.value->>'active_duration_minutes','')::numeric,h.duration_minutes),
      active_duration_source=case
        when nullif(x.value->>'active_duration_minutes','') is not null then 'health_connect'
        else 'elapsed'
      end,
      updated_at=v_now
  from jsonb_array_elements(coalesce(p_payload->'exercises','[]'::jsonb)) x
  where h.owner_id=p_owner and h.is_test=p_is_test and h.provider='health_connect'
    and h.source_record_id=x.value->>'source_record_id';

  update public.health_daily_summaries d
  set total_calories=nullif(x.value->>'total_calories','')::numeric,
      total_calorie_source=case when nullif(x.value->>'total_calories','') is null then null else 'health_connect_total_calories_burned' end,
      updated_at=v_now
  from jsonb_array_elements(coalesce(p_payload->'daily','[]'::jsonb)) x
  where d.owner_id=p_owner and d.is_test=p_is_test and d.local_date=(x.value->>'date')::date;

  update public.health_daily_summaries d
  set cycling_equivalent_steps=coalesce((
        select sum(e.cycling_equivalent_steps)::integer
        from public.health_exercise_sessions e
        where e.owner_id=p_owner and e.is_test=p_is_test
          and e.local_date=d.local_date and e.deleted_at is null and e.is_cycling
      ),0),
      updated_at=v_now
  where d.owner_id=p_owner and d.is_test=p_is_test
    and d.local_date between ((p_payload->>'window_start')::timestamptz at time zone 'Asia/Makassar')::date
      and (((p_payload->>'window_end')::timestamptz-interval '1 second') at time zone 'Asia/Makassar')::date;

  v_counts=jsonb_build_object(
    'daily',jsonb_array_length(coalesce(p_payload->'daily','[]'::jsonb)),
    'exercises',jsonb_array_length(coalesce(p_payload->'exercises','[]'::jsonb)),
    'sleep',jsonb_array_length(coalesce(p_payload->'sleep','[]'::jsonb)),
    'heart_rate_days',jsonb_array_length(coalesce(p_payload->'heart_rate','[]'::jsonb)),
    'exercise_rows',coalesce((p_ingest_result->>'exercise_rows')::integer,0),
    'sleep_rows',coalesce((p_ingest_result->>'sleep_rows')::integer,0)
  );
  v_status=case when v_fingerprint<>'' and v_fingerprint is not distinct from v_previous then 'no_changes' else 'success' end;

  update public.health_connections
  set snapshot_fingerprint=nullif(v_fingerprint,''),
      last_sync_status=v_status,
      last_sync_trigger=left(coalesce(p_payload->>'sync_trigger','manual'),40),
      last_sync_counts=v_counts,
      last_error=null,
      updated_at=v_now
  where owner_id=p_owner and is_test=p_is_test and device_id=left(p_payload->>'device_id',200);

  update public.health_sync_requests
  set status='completed',completed_at=v_now,last_error=null,updated_at=v_now
  where owner_id=p_owner and is_test=p_is_test and status='pending';

  return coalesce(p_ingest_result,'{}'::jsonb)||jsonb_build_object(
    'sync_status',v_status,'sync_trigger',coalesce(p_payload->>'sync_trigger','manual'),
    'counts',v_counts
  );
end $$;

revoke all on function public.health_finalize_sync(uuid,jsonb,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.health_finalize_sync(uuid,jsonb,boolean,jsonb) to service_role;

comment on column public.health_exercise_sessions.duration_minutes is
  'Elapsed source-session minutes from start to end; may include pauses.';
comment on column public.health_exercise_sessions.active_duration_minutes is
  'Effective active exercise minutes after Health Connect pause segments or a preserved manual correction.';
comment on column public.health_daily_summaries.active_calories is
  'Authoritative Health Connect active-energy aggregate for the local day; exercise is included only where exported as active energy.';
comment on column public.health_daily_summaries.total_calories is
  'Health Connect total-energy aggregate including resting energy, when supplied by the companion.';
