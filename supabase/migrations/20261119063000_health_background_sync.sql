alter table public.health_connections
  add column if not exists snapshot_fingerprint text,
  add column if not exists last_sync_status text not null default 'never',
  add column if not exists last_sync_trigger text,
  add column if not exists last_sync_counts jsonb not null default '{}'::jsonb;

alter table public.health_connections
  drop constraint if exists health_connections_last_sync_status_check;
alter table public.health_connections
  add constraint health_connections_last_sync_status_check
  check (last_sync_status in ('never','syncing','success','no_changes','error','permission_required','authentication_required'));

alter table public.health_exercise_sessions
  add column if not exists workout_calories numeric(10,2)
    check (workout_calories is null or workout_calories between 0 and 50000),
  add column if not exists workout_calorie_source text;

comment on column public.health_exercise_sessions.workout_calories is
  'Measured workout calories exported by Samsung Health as Health Connect TotalCaloriesBurnedRecord. Kept separate from daily active calories.';

create table if not exists public.health_sync_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_test boolean not null default false,
  requested_at timestamptz not null default now(),
  requested_reason text not null default 'web_stale',
  status text not null default 'pending' check (status in ('pending','completed','error')),
  completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key(owner_id,is_test)
);
alter table public.health_sync_requests enable row level security;
grant select,insert,update on public.health_sync_requests to authenticated;
drop policy if exists "health_sync_requests_owner_select" on public.health_sync_requests;
create policy "health_sync_requests_owner_select" on public.health_sync_requests for select to authenticated
using ((select auth.uid())=owner_id);
drop policy if exists "health_sync_requests_owner_insert" on public.health_sync_requests;
create policy "health_sync_requests_owner_insert" on public.health_sync_requests for insert to authenticated
with check ((select auth.uid())=owner_id);
drop policy if exists "health_sync_requests_owner_update" on public.health_sync_requests;
create policy "health_sync_requests_owner_update" on public.health_sync_requests for update to authenticated
using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);

create or replace function public.health_finalize_sync(
  p_owner uuid,
  p_payload jsonb,
  p_is_test boolean,
  p_ingest_result jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
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
      updated_at=v_now
  from jsonb_array_elements(coalesce(p_payload->'exercises','[]'::jsonb)) x
  where h.owner_id=p_owner and h.is_test=p_is_test and h.provider='health_connect'
    and h.source_record_id=x.value->>'source_record_id';

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
