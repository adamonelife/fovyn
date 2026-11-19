-- Fovyn V1.3: additive Health Connect ingestion and reporting.
-- Source health records remain separate from Training and all existing history.

create table public.health_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  provider text not null default 'health_connect' check (provider = 'health_connect'),
  device_id text not null check (char_length(device_id) between 8 and 200),
  device_name text not null default 'Android phone' check (char_length(device_name) between 1 and 200),
  is_primary boolean not null default false,
  permissions jsonb not null default '[]'::jsonb check (jsonb_typeof(permissions) = 'array'),
  app_version text,
  last_attempted_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,provider,device_id)
);
create unique index health_connections_one_primary on public.health_connections(owner_id,is_test,provider) where is_primary;

create table public.health_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  local_date date not null,
  actual_steps integer not null default 0 check (actual_steps between 0 and 500000),
  active_calories numeric(10,2) not null default 0 check (active_calories between 0 and 50000),
  cycling_equivalent_steps integer not null default 0 check (cycling_equivalent_steps between 0 and 100000),
  formula_version text not null default 'cycle-duration-intensity-v1',
  source_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,local_date)
);

create table public.health_exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  provider text not null default 'health_connect' check (provider = 'health_connect'),
  source_record_id text not null check (char_length(source_record_id) between 1 and 300),
  data_origin text not null check (char_length(data_origin) between 1 and 300),
  exercise_type integer not null,
  exercise_label text not null check (char_length(exercise_label) between 1 and 200),
  title text,
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at > started_at),
  local_date date not null,
  duration_minutes numeric(10,2) not null check (duration_minutes > 0 and duration_minutes <= 1440),
  distance_km numeric(12,3) check (distance_km is null or distance_km between 0 and 10000),
  active_calories numeric(10,2) check (active_calories is null or active_calories between 0 and 50000),
  average_heart_rate numeric(7,2) check (average_heart_rate is null or average_heart_rate between 20 and 300),
  is_cycling boolean not null default false,
  cycling_equivalent_steps integer not null default 0 check (cycling_equivalent_steps between 0 and 100000),
  cycling_confidence text check (cycling_confidence is null or cycling_confidence in ('low','medium')),
  formula_version text,
  possible_training_overlap boolean not null default false,
  source_last_modified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,provider,source_record_id)
);
create index health_exercise_owner_date on public.health_exercise_sessions(owner_id,is_test,local_date) where deleted_at is null;

create table public.health_sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  provider text not null default 'health_connect' check (provider = 'health_connect'),
  source_record_id text not null check (char_length(source_record_id) between 1 and 300),
  data_origin text not null check (char_length(data_origin) between 1 and 300),
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at > started_at),
  sleep_date date not null,
  duration_minutes numeric(10,2) not null check (duration_minutes > 0 and duration_minutes <= 1440),
  stages jsonb not null default '{}'::jsonb check (jsonb_typeof(stages) = 'object'),
  source_last_modified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,provider,source_record_id)
);
create index health_sleep_owner_date on public.health_sleep_sessions(owner_id,is_test,sleep_date) where deleted_at is null;

create table public.health_heart_rate_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  local_date date not null,
  minimum_bpm numeric(7,2) check (minimum_bpm is null or minimum_bpm between 20 and 300),
  maximum_bpm numeric(7,2) check (maximum_bpm is null or maximum_bpm between 20 and 300),
  average_bpm numeric(7,2) check (average_bpm is null or average_bpm between 20 and 300),
  sample_count integer not null default 0 check (sample_count between 0 and 1000000),
  source_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,local_date)
);

create table public.health_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  device_id text not null,
  data_type text not null,
  cursor_value text,
  window_started_at timestamptz,
  window_ended_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test,device_id,data_type)
);

create table public.health_metric_targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  is_test boolean not null default false,
  actual_steps_daily integer not null default 10000 check (actual_steps_daily between 100 and 100000),
  activity_equivalent_daily integer not null default 10000 check (activity_equivalent_daily between 100 and 100000),
  active_calories_daily integer not null default 500 check (active_calories_daily between 10 and 10000),
  sleep_hours_daily numeric(4,2) not null default 8 check (sleep_hours_daily between 1 and 16),
  exercise_minutes_weekly integer not null default 150 check (exercise_minutes_weekly between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,is_test)
);

do $$ declare t text; begin
  foreach t in array array['health_connections','health_daily_summaries','health_exercise_sessions','health_sleep_sessions','health_heart_rate_summaries','health_sync_cursors','health_metric_targets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy health_owner_context on public.%I for all to authenticated using (owner_id=(select auth.uid()) and is_test=((select private.active_data_context())=''test'')) with check (owner_id=(select auth.uid()) and is_test=((select private.active_data_context())=''test''))',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

create or replace function private.cycling_equivalent_steps_v1(p_duration_minutes numeric,p_active_calories numeric)
returns integer language sql immutable parallel safe set search_path='' as $$
  select case when coalesce(p_duration_minutes,0)<=0 then 0 else
    round(least(p_duration_minutes,180) * case
      when p_active_calories is null then 70
      when p_active_calories/greatest(p_duration_minutes,1) >= 8 then 100
      when p_active_calories/greatest(p_duration_minutes,1) >= 5 then 85
      else 70 end)::integer end
$$;

create or replace function public.health_ingest_sync(p_owner uuid,p_payload jsonb,p_is_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_now timestamptz:=now();
  v_device_id text:=left(coalesce(p_payload->>'device_id',''),200);
  v_window_start timestamptz:=(p_payload->>'window_start')::timestamptz;
  v_window_end timestamptz:=(p_payload->>'window_end')::timestamptz;
  v_exercise_count integer:=0;
  v_sleep_count integer:=0;
begin
  if p_owner is null or not exists(select 1 from auth.users where id=p_owner) then raise exception 'invalid_owner' using errcode='22023'; end if;
  if v_device_id='' or v_window_start is null or v_window_end is null or v_window_end<=v_window_start or v_window_end-v_window_start>interval '31 days' then raise exception 'invalid_sync_window' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_payload->'daily','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_payload->'daily','[]'::jsonb))>32 then raise exception 'invalid_daily_payload' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_payload->'exercises','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_payload->'exercises','[]'::jsonb))>500 then raise exception 'invalid_exercise_payload' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_payload->'sleep','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_payload->'sleep','[]'::jsonb))>100 then raise exception 'invalid_sleep_payload' using errcode='22023'; end if;

  if coalesce((p_payload->>'is_primary')::boolean,false) then
    update public.health_connections set is_primary=false,updated_at=v_now where owner_id=p_owner and is_test=p_is_test and provider='health_connect';
  end if;
  insert into public.health_connections(owner_id,is_test,device_id,device_name,is_primary,permissions,app_version,last_attempted_sync_at,last_successful_sync_at,last_error,updated_at)
  values(p_owner,p_is_test,v_device_id,left(coalesce(nullif(p_payload->>'device_name',''),'Android phone'),200),coalesce((p_payload->>'is_primary')::boolean,false),coalesce(p_payload->'permissions','[]'::jsonb),left(p_payload->>'app_version',80),v_now,v_now,null,v_now)
  on conflict(owner_id,is_test,provider,device_id) do update set device_name=excluded.device_name,is_primary=excluded.is_primary,permissions=excluded.permissions,app_version=excluded.app_version,last_attempted_sync_at=v_now,last_successful_sync_at=v_now,last_error=null,updated_at=v_now;

  insert into public.health_daily_summaries(owner_id,is_test,local_date,actual_steps,active_calories,source_updated_at,last_synced_at,updated_at)
  select p_owner,p_is_test,(x->>'date')::date,greatest(0,least(500000,coalesce((x->>'actual_steps')::integer,0))),greatest(0,least(50000,coalesce((x->>'active_calories')::numeric,0))),nullif(x->>'source_updated_at','')::timestamptz,v_now,v_now
  from jsonb_array_elements(coalesce(p_payload->'daily','[]'::jsonb)) x
  on conflict(owner_id,is_test,local_date) do update set actual_steps=excluded.actual_steps,active_calories=excluded.active_calories,source_updated_at=excluded.source_updated_at,last_synced_at=v_now,updated_at=v_now;

  insert into public.health_exercise_sessions(owner_id,is_test,source_record_id,data_origin,exercise_type,exercise_label,title,started_at,ended_at,local_date,duration_minutes,distance_km,active_calories,average_heart_rate,is_cycling,cycling_equivalent_steps,cycling_confidence,formula_version,possible_training_overlap,source_last_modified_at,deleted_at,updated_at)
  select p_owner,p_is_test,left(x->>'source_record_id',300),left(coalesce(nullif(x->>'data_origin',''),'unknown'),300),coalesce((x->>'exercise_type')::integer,0),left(coalesce(nullif(x->>'exercise_label',''),'Exercise'),200),left(x->>'title',300),(x->>'started_at')::timestamptz,(x->>'ended_at')::timestamptz,((x->>'started_at')::timestamptz at time zone 'Asia/Makassar')::date,greatest(0.01,least(1440,coalesce((x->>'duration_minutes')::numeric,0))),nullif(x->>'distance_km','')::numeric,nullif(x->>'active_calories','')::numeric,nullif(x->>'average_heart_rate','')::numeric,coalesce((x->>'is_cycling')::boolean,false),case when coalesce((x->>'is_cycling')::boolean,false) then private.cycling_equivalent_steps_v1((x->>'duration_minutes')::numeric,nullif(x->>'active_calories','')::numeric) else 0 end,case when coalesce((x->>'is_cycling')::boolean,false) then case when nullif(x->>'active_calories','') is null then 'low' else 'medium' end else null end,case when coalesce((x->>'is_cycling')::boolean,false) then 'cycle-duration-intensity-v1' else null end,exists(select 1 from public.training_sessions ts where ts.owner_id=p_owner and ts.is_test=p_is_test and ts.performed_on=((x->>'started_at')::timestamptz at time zone 'Asia/Makassar')::date and coalesce((x->>'exercise_type')::integer,0)=70),nullif(x->>'source_last_modified_at','')::timestamptz,null,v_now
  from jsonb_array_elements(coalesce(p_payload->'exercises','[]'::jsonb)) x
  where coalesce(x->>'source_record_id','')<>'' and (x->>'ended_at')::timestamptz>(x->>'started_at')::timestamptz
  on conflict(owner_id,is_test,provider,source_record_id) do update set data_origin=excluded.data_origin,exercise_type=excluded.exercise_type,exercise_label=excluded.exercise_label,title=excluded.title,started_at=excluded.started_at,ended_at=excluded.ended_at,local_date=excluded.local_date,duration_minutes=excluded.duration_minutes,distance_km=excluded.distance_km,active_calories=excluded.active_calories,average_heart_rate=excluded.average_heart_rate,is_cycling=excluded.is_cycling,cycling_equivalent_steps=excluded.cycling_equivalent_steps,cycling_confidence=excluded.cycling_confidence,formula_version=excluded.formula_version,possible_training_overlap=excluded.possible_training_overlap,source_last_modified_at=excluded.source_last_modified_at,deleted_at=null,updated_at=v_now;
  get diagnostics v_exercise_count=row_count;

  update public.health_exercise_sessions h set deleted_at=v_now,updated_at=v_now where h.owner_id=p_owner and h.is_test=p_is_test and h.provider='health_connect' and h.deleted_at is null and h.started_at>=v_window_start and h.started_at<v_window_end and not exists(select 1 from jsonb_array_elements(coalesce(p_payload->'exercises','[]'::jsonb)) x where x->>'source_record_id'=h.source_record_id);

  insert into public.health_sleep_sessions(owner_id,is_test,source_record_id,data_origin,started_at,ended_at,sleep_date,duration_minutes,stages,source_last_modified_at,deleted_at,updated_at)
  select p_owner,p_is_test,left(x->>'source_record_id',300),left(coalesce(nullif(x->>'data_origin',''),'unknown'),300),(x->>'started_at')::timestamptz,(x->>'ended_at')::timestamptz,((x->>'ended_at')::timestamptz at time zone 'Asia/Makassar')::date,greatest(0.01,least(1440,coalesce((x->>'duration_minutes')::numeric,0))),coalesce(x->'stages','{}'::jsonb),nullif(x->>'source_last_modified_at','')::timestamptz,null,v_now
  from jsonb_array_elements(coalesce(p_payload->'sleep','[]'::jsonb)) x
  where coalesce(x->>'source_record_id','')<>'' and (x->>'ended_at')::timestamptz>(x->>'started_at')::timestamptz
  on conflict(owner_id,is_test,provider,source_record_id) do update set data_origin=excluded.data_origin,started_at=excluded.started_at,ended_at=excluded.ended_at,sleep_date=excluded.sleep_date,duration_minutes=excluded.duration_minutes,stages=excluded.stages,source_last_modified_at=excluded.source_last_modified_at,deleted_at=null,updated_at=v_now;
  get diagnostics v_sleep_count=row_count;

  update public.health_sleep_sessions h set deleted_at=v_now,updated_at=v_now where h.owner_id=p_owner and h.is_test=p_is_test and h.provider='health_connect' and h.deleted_at is null and h.ended_at>v_window_start and h.started_at<v_window_end and not exists(select 1 from jsonb_array_elements(coalesce(p_payload->'sleep','[]'::jsonb)) x where x->>'source_record_id'=h.source_record_id);

  insert into public.health_heart_rate_summaries(owner_id,is_test,local_date,minimum_bpm,maximum_bpm,average_bpm,sample_count,source_updated_at,last_synced_at,updated_at)
  select p_owner,p_is_test,(x->>'date')::date,nullif(x->>'minimum_bpm','')::numeric,nullif(x->>'maximum_bpm','')::numeric,nullif(x->>'average_bpm','')::numeric,greatest(0,least(1000000,coalesce((x->>'sample_count')::integer,0))),nullif(x->>'source_updated_at','')::timestamptz,v_now,v_now
  from jsonb_array_elements(coalesce(p_payload->'heart_rate','[]'::jsonb)) x
  on conflict(owner_id,is_test,local_date) do update set minimum_bpm=excluded.minimum_bpm,maximum_bpm=excluded.maximum_bpm,average_bpm=excluded.average_bpm,sample_count=excluded.sample_count,source_updated_at=excluded.source_updated_at,last_synced_at=v_now,updated_at=v_now;

  update public.health_daily_summaries d set cycling_equivalent_steps=coalesce((select sum(e.cycling_equivalent_steps)::integer from public.health_exercise_sessions e where e.owner_id=p_owner and e.is_test=p_is_test and e.local_date=d.local_date and e.deleted_at is null and e.is_cycling),0),formula_version='cycle-duration-intensity-v1',updated_at=v_now where d.owner_id=p_owner and d.is_test=p_is_test and d.local_date between (v_window_start at time zone 'Asia/Makassar')::date and ((v_window_end-interval '1 second') at time zone 'Asia/Makassar')::date;

  insert into public.health_sync_cursors(owner_id,is_test,device_id,data_type,cursor_value,window_started_at,window_ended_at,last_synced_at,updated_at)
  values(p_owner,p_is_test,v_device_id,'snapshot','foreground-14-day-v1',v_window_start,v_window_end,v_now,v_now)
  on conflict(owner_id,is_test,device_id,data_type) do update set cursor_value=excluded.cursor_value,window_started_at=excluded.window_started_at,window_ended_at=excluded.window_ended_at,last_synced_at=v_now,updated_at=v_now;

  insert into public.health_metric_targets(owner_id,is_test) values(p_owner,p_is_test) on conflict(owner_id,is_test) do nothing;
  return jsonb_build_object('ok',true,'synced_at',v_now,'exercise_rows',v_exercise_count,'sleep_rows',v_sleep_count);
exception when others then
  update public.health_connections set last_attempted_sync_at=v_now,last_error=left(sqlerrm,500),updated_at=v_now where owner_id=p_owner and is_test=p_is_test and device_id=v_device_id;
  raise;
end $$;

revoke all on function public.health_ingest_sync(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.health_ingest_sync(uuid,jsonb,boolean) to service_role;

comment on column public.health_daily_summaries.actual_steps is 'Measured Health Connect steps only. Never includes cycling estimates.';
comment on column public.health_daily_summaries.cycling_equivalent_steps is 'Estimated, versioned cycling activity equivalence kept separate from actual steps.';
comment on function private.cycling_equivalent_steps_v1(numeric,numeric) is 'Conservative estimate: 70/85/100 equivalents per cycling minute based on active kcal/min, capped at 180 minutes.';
