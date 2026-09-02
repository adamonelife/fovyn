alter table public.goal_contributions
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.goal_contributions
  drop constraint if exists goal_contributions_pkey;

alter table public.goal_contributions
  add constraint goal_contributions_pkey primary key (id);

alter table public.goal_contributions
  add constraint goal_contributions_goal_record_key unique (goal_id, record_id);

alter table public.tracking_records
  add column if not exists client_request_id uuid;

create unique index if not exists tracking_records_owner_request_key
  on public.tracking_records(owner_id, client_request_id)
  where client_request_id is not null;

drop function if exists public.add_goal_contribution(uuid,numeric,text,timestamptz);
create function public.add_goal_contribution(
  p_goal_id uuid,
  p_value numeric,
  p_note text default null,
  p_occurred_at timestamptz default now(),
  p_request_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_tracker uuid;
  v_unit text;
  v_custom text;
  v_record uuid;
  v_timezone text;
  v_date date;
  v_today date;
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=v_owner;
  v_timezone := coalesce(v_timezone,'UTC');
  v_date := (coalesce(p_occurred_at,now()) at time zone v_timezone)::date;
  v_today := (now() at time zone v_timezone)::date;
  if v_date > v_today then raise exception 'A contribution cannot be dated in the future'; end if;
  if v_date < v_today - 7 then raise exception 'A contribution can be backdated by up to seven days'; end if;

  select gt.tracker_id,r.unit_key,r.custom_unit into v_tracker,v_unit,v_custom
  from public.goals g
  join public.goal_trackers gt on gt.goal_id=g.id and gt.owner_id=v_owner
  join public.goal_rules r on r.goal_id=g.id and r.owner_id=v_owner
    and r.effective_from <= v_date
    and (r.effective_to is null or r.effective_to >= v_date)
  where g.id=p_goal_id and g.owner_id=v_owner and g.status='active'
    and g.starts_on <= v_date
    and (g.ends_on is null or g.ends_on >= v_date)
  order by r.effective_from desc limit 1;
  if v_tracker is null then raise exception 'That date is outside this Goal''s active period'; end if;

  insert into public.tracking_records(owner_id,tracker_id,value,unit_key,custom_unit,note,occurred_at,client_request_id)
  values(v_owner,v_tracker,p_value,v_unit,v_custom,nullif(btrim(coalesce(p_note,'')),''),coalesce(p_occurred_at,now()),p_request_id)
  on conflict (owner_id,client_request_id) where client_request_id is not null
  do update set client_request_id=excluded.client_request_id
  returning id into v_record;
  return v_record;
end
$$;

revoke execute on function public.add_goal_contribution(uuid,numeric,text,timestamptz,uuid) from public, anon;
grant execute on function public.add_goal_contribution(uuid,numeric,text,timestamptz,uuid) to authenticated;

create or replace function public.correct_goal_contribution(
  p_goal_id uuid,
  p_record_id uuid,
  p_value numeric,
  p_note text,
  p_occurred_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_timezone text;
  v_date date;
  v_today date;
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=v_owner;
  v_timezone := coalesce(v_timezone,'UTC');
  v_date := (p_occurred_at at time zone v_timezone)::date;
  v_today := (now() at time zone v_timezone)::date;
  if v_date > v_today or v_date < v_today - 7 then raise exception 'Choose a date within the last seven days'; end if;
  if not exists (
    select 1 from public.goals g
    join public.goal_contributions gc on gc.goal_id=g.id and gc.owner_id=v_owner
    where g.id=p_goal_id and g.owner_id=v_owner and gc.record_id=p_record_id
      and g.starts_on <= v_date and (g.ends_on is null or g.ends_on >= v_date)
  ) then raise exception 'That contribution or date is not available'; end if;
  update public.tracking_records
  set value=p_value,note=nullif(btrim(coalesce(p_note,'')),''),occurred_at=p_occurred_at,
      corrected_at=now(),updated_at=now()
  where id=p_record_id and owner_id=v_owner and deleted_at is null;
  if not found then raise exception 'That contribution is not available'; end if;
end
$$;

revoke execute on function public.correct_goal_contribution(uuid,uuid,numeric,text,timestamptz) from public, anon;
grant execute on function public.correct_goal_contribution(uuid,uuid,numeric,text,timestamptz) to authenticated;
