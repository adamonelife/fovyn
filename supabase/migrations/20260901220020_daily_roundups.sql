create table if not exists public.daily_roundups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  roundup_date date not null,
  mood text not null constraint daily_roundups_mood_check check (mood in ('bad','ok','great')),
  note text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note_id uuid references public.notes(id) on delete set null,
  unique(owner_id,roundup_date)
);

create index if not exists daily_roundups_owner_date_idx
  on public.daily_roundups(owner_id,roundup_date desc);
create index if not exists daily_roundups_note_idx
  on public.daily_roundups(note_id) where note_id is not null;

alter table public.daily_roundups enable row level security;
revoke all on table public.daily_roundups from anon,authenticated;
grant select,insert,update on table public.daily_roundups to authenticated;

drop policy if exists roundups_select_own on public.daily_roundups;
create policy roundups_select_own on public.daily_roundups
  for select to authenticated
  using ((select auth.uid())=owner_id);

drop policy if exists roundups_insert_own on public.daily_roundups;
create policy roundups_insert_own on public.daily_roundups
  for insert to authenticated
  with check ((select auth.uid())=owner_id);

drop policy if exists roundups_update_own on public.daily_roundups;
create policy roundups_update_own on public.daily_roundups
  for update to authenticated
  using ((select auth.uid())=owner_id)
  with check ((select auth.uid())=owner_id);

create or replace function public.save_daily_roundup(
  p_roundup_date date,
  p_mood text,
  p_note text,
  p_resolutions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_item jsonb;
  v_note_id uuid;
  v_roundup uuid;
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if p_mood not in ('bad','ok','great') then raise exception 'Invalid Daily Rating'; end if;
  if jsonb_typeof(coalesce(p_resolutions,'[]'::jsonb))<>'array' then raise exception 'Invalid resolutions'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_resolutions,'[]'::jsonb))
  loop
    if v_item->>'status' not in ('complete','failed','skipped') then raise exception 'Invalid item resolution'; end if;
    insert into public.habit_entries(habit_id,owner_id,entry_date,status,value,note,schedule_id,target_snapshot,updated_at)
    select h.id,v_owner,p_roundup_date,v_item->>'status',nullif(v_item->>'value','')::numeric,null,s.id,h.target_value,now()
    from public.habits h
    left join lateral (
      select hs.id from public.habit_schedules hs
      where hs.habit_id=h.id and hs.owner_id=v_owner and hs.effective_from<=p_roundup_date
        and (hs.effective_to is null or hs.effective_to>=p_roundup_date)
      order by hs.effective_from desc limit 1
    ) s on true
    where h.id=(v_item->>'habit_id')::uuid and h.owner_id=v_owner
    on conflict(habit_id,entry_date) do update
      set status=excluded.status,value=excluded.value,note=null,updated_at=now();
    if not found then raise exception 'Habit not found'; end if;
  end loop;

  if nullif(btrim(coalesce(p_note,'')),'') is not null then
    insert into public.notes(owner_id,title,body,occurred_at)
    values(v_owner,'Daily reflection',btrim(p_note),(p_roundup_date::timestamp+time '20:00') at time zone 'UTC')
    returning id into v_note_id;
  end if;

  insert into public.daily_roundups(owner_id,roundup_date,mood,note,note_id,completed_at,updated_at)
  values(v_owner,p_roundup_date,p_mood,null,v_note_id,now(),now())
  on conflict(owner_id,roundup_date) do update
    set mood=excluded.mood,note=null,note_id=coalesce(excluded.note_id,public.daily_roundups.note_id),completed_at=now(),updated_at=now()
  returning id into v_roundup;
  return v_roundup;
end;
$$;

revoke execute on function public.save_daily_roundup(date,text,text,jsonb) from public,anon;
grant execute on function public.save_daily_roundup(date,text,text,jsonb) to authenticated;
