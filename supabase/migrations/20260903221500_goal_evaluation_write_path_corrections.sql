-- Keep contribution linking and evaluation correct when a record is edited,
-- backdated, soft-deleted, restored, or moved between trackers.
create or replace function public.link_tracking_record_goals()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_timezone text;v_date date;
begin
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=new.owner_id;
  v_date:=(new.occurred_at at time zone coalesce(v_timezone,'UTC'))::date;
  delete from public.goal_contributions gc where gc.record_id=new.id and gc.owner_id=new.owner_id
    and (new.deleted_at is not null or not exists(
      select 1 from public.goal_trackers gt join public.goals g on g.id=gt.goal_id and g.owner_id=new.owner_id
      where gt.goal_id=gc.goal_id and gt.owner_id=new.owner_id and gt.tracker_id=new.tracker_id
        and v_date>=g.starts_on and (g.ends_on is null or v_date<=g.ends_on)));
  if new.deleted_at is null then
    insert into public.goal_contributions(owner_id,goal_id,record_id)
    select new.owner_id,gt.goal_id,new.id from public.goal_trackers gt
    join public.goals g on g.id=gt.goal_id and g.owner_id=new.owner_id
    where gt.owner_id=new.owner_id and gt.tracker_id=new.tracker_id and v_date>=g.starts_on
      and (g.ends_on is null or v_date<=g.ends_on) on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.evaluate_tracking_record_goals()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v record;v_old_date date;v_new_date date;v_tz text;v_owner uuid;
begin
  v_owner:=case when tg_op='DELETE' then old.owner_id else new.owner_id end;
  select coalesce(timezone,'UTC') into v_tz from public.profiles where id=v_owner;
  if tg_op<>'INSERT' then v_old_date:=(old.occurred_at at time zone coalesce(v_tz,'UTC'))::date;end if;
  if tg_op<>'DELETE' then v_new_date:=(new.occurred_at at time zone coalesce(v_tz,'UTC'))::date;end if;
  for v in
    select distinct gt.goal_id from public.goal_trackers gt where gt.owner_id=v_owner
      and ((tg_op<>'INSERT' and gt.tracker_id=old.tracker_id) or (tg_op<>'DELETE' and gt.tracker_id=new.tracker_id))
  loop
    if v_old_date is not null then perform public.evaluate_goal_period(v.goal_id,v_old_date,false);end if;
    if v_new_date is not null and v_new_date is distinct from v_old_date then perform public.evaluate_goal_period(v.goal_id,v_new_date,false);end if;
  end loop;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

-- Re-evaluate affected data when a Goal rule is edited or replaced.
create or replace function public.evaluate_changed_goal_rule()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_date date;
begin
  for v_date in select distinct (r.occurred_at at time zone coalesce(p.timezone,'UTC'))::date
    from public.goal_contributions gc join public.tracking_records r on r.id=gc.record_id
    join public.profiles p on p.id=gc.owner_id where gc.goal_id=new.goal_id and r.deleted_at is null
  loop perform public.evaluate_goal_period(new.goal_id,v_date,false);end loop;
  return new;
end;
$$;

drop trigger if exists zz_evaluate_changed_goal_rule on public.goal_rules;
create trigger zz_evaluate_changed_goal_rule after insert or update on public.goal_rules
for each row execute function public.evaluate_changed_goal_rule();

revoke all on function public.evaluate_changed_goal_rule() from public,anon,authenticated;
