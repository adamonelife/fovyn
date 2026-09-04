-- A module record remains the single canonical fact. This table records only
-- the reversible effect that fact has on a Goal.
create table public.goal_source_contributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  source_record_type text not null check (source_record_type in (
    'nutrition_entry','sleep_entry','cardio_entry','training_session',
    'hobby_entry','note','money_transaction'
  )),
  source_record_id uuid not null,
  contribution_type text not null default 'explicit_occurrence'
    check (contribution_type in ('explicit_occurrence','automatic_metric')),
  value numeric,
  unit_key text,
  occurred_at timestamptz not null,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_source_contributions_goal_owner_fkey
    foreign key (goal_id,owner_id) references public.goals(id,owner_id) on delete cascade,
  unique(goal_id,source_record_type,source_record_id)
);

create index goal_source_contributions_owner_goal_date_idx
  on public.goal_source_contributions(owner_id,goal_id,occurred_at desc);
create index goal_source_contributions_source_idx
  on public.goal_source_contributions(owner_id,source_record_type,source_record_id);

alter table public.goal_source_contributions enable row level security;
create policy goal_source_contributions_owner_read on public.goal_source_contributions
  for select to authenticated using ((select auth.uid())=owner_id);
create policy goal_source_contributions_owner_insert on public.goal_source_contributions
  for insert to authenticated with check ((select auth.uid())=owner_id);
create policy goal_source_contributions_owner_update on public.goal_source_contributions
  for update to authenticated using ((select auth.uid())=owner_id)
  with check ((select auth.uid())=owner_id);
create policy goal_source_contributions_owner_delete on public.goal_source_contributions
  for delete to authenticated using ((select auth.uid())=owner_id);
grant select,insert,update,delete on public.goal_source_contributions to authenticated;

drop trigger if exists set_test_provenance on public.goal_source_contributions;
create trigger set_test_provenance before insert or update of is_test
  on public.goal_source_contributions for each row
  execute function private.apply_test_provenance();
create policy test_context_isolation on public.goal_source_contributions
  as restrictive for all to authenticated
  using (is_test=(private.active_data_context()='test'))
  with check (is_test=(private.active_data_context()='test'));

-- Explicit links are occurrence contributions only for count-based Goal rules.
-- This prevents an arbitrary meal from adding 1 kg, 1 kcal, or 1 minute.
create or replace function public.sync_nutrition_goal_contribution()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare v_link public.nutrition_entry_goals%rowtype; v_entry public.nutrition_entries%rowtype;
begin
  v_link:=case when tg_op='DELETE' then old else new end;
  if tg_op='DELETE' then
    delete from public.goal_source_contributions
      where owner_id=v_link.owner_id and goal_id=v_link.goal_id
        and source_record_type='nutrition_entry' and source_record_id=v_link.nutrition_entry_id;
    return old;
  end if;
  select * into v_entry from public.nutrition_entries
    where id=new.nutrition_entry_id and owner_id=new.owner_id and deleted_at is null;
  if not found then return new; end if;
  if exists (
    select 1 from public.goal_rules r
    where r.goal_id=new.goal_id and r.owner_id=new.owner_id
      and r.measurement_type='count'
      and r.effective_from<=(v_entry.occurred_at at time zone coalesce((select timezone from public.profiles where id=new.owner_id),'UTC'))::date
      and (r.effective_to is null or r.effective_to>=(v_entry.occurred_at at time zone coalesce((select timezone from public.profiles where id=new.owner_id),'UTC'))::date)
  ) then
    insert into public.goal_source_contributions(
      owner_id,goal_id,source_record_type,source_record_id,contribution_type,value,unit_key,occurred_at,is_test
    ) values (
      new.owner_id,new.goal_id,'nutrition_entry',new.nutrition_entry_id,
      'explicit_occurrence',1,'count',v_entry.occurred_at,v_entry.is_test
    ) on conflict(goal_id,source_record_type,source_record_id) do update set
      occurred_at=excluded.occurred_at,value=excluded.value,unit_key=excluded.unit_key,
      is_test=excluded.is_test,updated_at=now();
  else
    delete from public.goal_source_contributions
      where owner_id=new.owner_id and goal_id=new.goal_id
        and source_record_type='nutrition_entry' and source_record_id=new.nutrition_entry_id;
  end if;
  return new;
end;
$$;

create or replace function public.sync_nutrition_entry_contributions()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if new.deleted_at is not null then
    delete from public.goal_source_contributions
      where owner_id=new.owner_id and source_record_type='nutrition_entry' and source_record_id=new.id;
  else
    update public.goal_source_contributions set occurred_at=new.occurred_at,
      is_test=new.is_test,updated_at=now()
      where owner_id=new.owner_id and source_record_type='nutrition_entry' and source_record_id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_nutrition_goal_contribution on public.nutrition_entry_goals;
create trigger sync_nutrition_goal_contribution
  after insert or update or delete on public.nutrition_entry_goals
  for each row execute function public.sync_nutrition_goal_contribution();
drop trigger if exists sync_nutrition_entry_contributions on public.nutrition_entries;
create trigger sync_nutrition_entry_contributions
  after update of occurred_at,deleted_at,is_test on public.nutrition_entries
  for each row execute function public.sync_nutrition_entry_contributions();

create or replace function public.forest_stage_for_goal(p_goal_id uuid)
returns smallint
language plpgsql security definer set search_path=''
as $$
declare
  v_goal public.goals%rowtype; v_count int; v_success int; v_resolved int;
  v_eligible_days int; v_consistency numeric; v_stage int:=1; v_required numeric;
  v_thresholds int[]:=array[7,14,21,28,42,56,70,84,98,112,140,168,196,224,252,280,308,365,426,487,548,609,670,730]; i int;
begin
  select * into v_goal from public.goals where id=p_goal_id;
  if not found then return 1; end if;
  select count(*) into v_count from (
    select r.occurred_at from public.goal_contributions gc join public.tracking_records r on r.id=gc.record_id
      where gc.goal_id=p_goal_id and r.deleted_at is null
    union all
    select sc.occurred_at from public.goal_source_contributions sc where sc.goal_id=p_goal_id and sc.value is not null
  ) facts where not exists (
    select 1 from public.goal_dormancy_periods d where d.goal_id=p_goal_id
      and facts.occurred_at>=d.dormant_from and facts.occurred_at<coalesce(d.awakened_at,'infinity'::timestamptz));
  if v_count=0 then return greatest(1,v_goal.forest_stage); end if;
  if v_count=1 then return greatest(2,v_goal.forest_stage); end if;
  v_stage:=3;
  select count(*) filter(where status='success'),count(*) filter(where status<>'open') into v_success,v_resolved
    from public.goal_evaluation_periods where goal_id=p_goal_id;
  if v_success=0 then return greatest(v_stage,v_goal.forest_stage); end if;
  v_eligible_days:=greatest(0,current_date-v_goal.starts_on+1-coalesce((select sum(
    greatest(0,least(current_date,coalesce(d.awakened_at::date,current_date))-greatest(v_goal.starts_on,d.dormant_from::date)+1))
    from public.goal_dormancy_periods d where d.goal_id=p_goal_id),0));
  v_consistency:=case when v_resolved=0 then 100 else 100.0*v_success/v_resolved end; v_stage:=4;
  for i in 1..array_length(v_thresholds,1) loop
    v_required:=case when i+3>=22 then 85 when i+3>=16 then 80 when i+3>=10 then 75 else 70 end;
    if v_eligible_days>=v_thresholds[i] and v_consistency>=v_required then v_stage:=least(27,i+3); end if;
  end loop;
  return greatest(v_stage,v_goal.forest_stage);
end;
$$;

create or replace function public.evaluate_goal_period(p_goal_id uuid,p_occurrence date,p_force_close boolean default false)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  v_goal public.goals%rowtype; v_rule public.goal_rules%rowtype; v_timezone text;
  v_start date;v_end date;v_actual numeric:=0;v_now_date date;v_status text:='open';v_period uuid;
  v_locked timestamptz;v_failed timestamptz;v_stage smallint;v_old_stage smallint;v_earned timestamptz;
begin
  select * into v_goal from public.goals where id=p_goal_id; if not found then return null; end if;
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=v_goal.owner_id;
  v_now_date:=(now() at time zone coalesce(v_timezone,'UTC'))::date;
  select * into v_rule from public.goal_rules where goal_id=p_goal_id and effective_from<=p_occurrence
    and (effective_to is null or effective_to>=p_occurrence) order by effective_from desc limit 1;
  if not found then return null; end if;
  select b.period_start,b.period_end into v_start,v_end from public.goal_period_bounds(v_goal.starts_on,v_rule.period,p_occurrence) b;
  v_start:=greatest(v_start,v_goal.starts_on,v_rule.effective_from);
  v_end:=least(v_end,coalesce(v_goal.ends_on,v_end),coalesce(v_rule.effective_to,v_end));
  with facts as (
    select r.value,r.occurred_at from public.goal_contributions gc join public.tracking_records r on r.id=gc.record_id
      where gc.goal_id=p_goal_id and r.deleted_at is null
    union all
    select sc.value,sc.occurred_at from public.goal_source_contributions sc
      where sc.goal_id=p_goal_id and sc.value is not null
  ), eligible as (
    select * from facts where (occurred_at at time zone coalesce(v_timezone,'UTC'))::date between v_start and v_end
      and not exists(select 1 from public.goal_dormancy_periods d where d.goal_id=p_goal_id
        and facts.occurred_at>=d.dormant_from and facts.occurred_at<coalesce(d.awakened_at,'infinity'::timestamptz))
  )
  select coalesce(case v_rule.aggregation when 'count' then count(*)::numeric when 'latest' then
    (array_agg(value order by occurred_at desc))[1] when 'average' then avg(value) else sum(value) end,0),max(occurred_at)
    into v_actual,v_earned from eligible;
  if v_rule.target_operator='minimum' and v_actual>=v_rule.target_min then v_status:='success';v_locked:=coalesce(v_earned,now());
  elsif v_rule.target_operator='maximum' and v_actual>v_rule.target_min then v_status:='failed';v_failed:=coalesce(v_earned,now());
  elsif v_rule.target_operator='exact' and v_actual>v_rule.target_min then v_status:='failed';v_failed:=coalesce(v_earned,now());
  elsif v_rule.target_operator='range' and v_actual>v_rule.target_max then v_status:='failed';v_failed:=coalesce(v_earned,now());
  elsif p_force_close or v_end<v_now_date then
    if (v_rule.target_operator='maximum' and v_actual<=v_rule.target_min)
      or (v_rule.target_operator='exact' and v_actual=v_rule.target_min)
      or (v_rule.target_operator='range' and v_actual between v_rule.target_min and v_rule.target_max)
      or (v_rule.target_operator='minimum' and v_actual>=v_rule.target_min)
    then v_status:='success';v_locked:=now(); else v_status:='failed';v_failed:=now(); end if;
  end if;
  insert into public.goal_evaluation_periods(owner_id,goal_id,rule_id,period_start,period_end,status,actual_value,achievement_locked_at,failure_locked_at,evaluated_at,closed_at,is_test)
  values(v_goal.owner_id,p_goal_id,v_rule.id,v_start,v_end,v_status,v_actual,v_locked,v_failed,now(),case when p_force_close or v_end<v_now_date then now() end,v_goal.is_test)
  on conflict(goal_id,rule_id,period_start,period_end) do update set actual_value=excluded.actual_value,evaluated_at=now(),status=case
    when goal_evaluation_periods.achievement_locked_at is not null then 'success'
    when goal_evaluation_periods.failure_locked_at is not null then 'failed' else excluded.status end,
    achievement_locked_at=coalesce(goal_evaluation_periods.achievement_locked_at,excluded.achievement_locked_at),
    failure_locked_at=coalesce(goal_evaluation_periods.failure_locked_at,excluded.failure_locked_at),closed_at=coalesce(goal_evaluation_periods.closed_at,excluded.closed_at)
  returning id,status,achievement_locked_at into v_period,v_status,v_locked;
  v_old_stage:=v_goal.forest_stage; v_stage:=public.forest_stage_for_goal(p_goal_id);
  if v_status='success' then v_stage:=greatest(v_stage,4); end if;
  if v_stage>v_old_stage then
    update public.goals set forest_stage=v_stage,forest_stage_updated_at=coalesce(v_locked,now()),updated_at=now() where id=p_goal_id and forest_stage<v_stage;
    insert into public.goal_growth_awards(owner_id,goal_id,evaluation_period_id,award_type,tree_stage,earned_at,details,is_test)
    values(v_goal.owner_id,p_goal_id,v_period,case v_stage when 2 then 'first_contribution' when 3 then 'second_contribution' else 'successful_period' end,v_stage,coalesce(v_locked,v_earned,now()),jsonb_build_object('from_stage',v_old_stage,'period_start',v_start,'period_end',v_end),v_goal.is_test) on conflict do nothing;
    insert into public.goal_events(owner_id,goal_id,event_type,occurred_at,details,is_test)
    select v_goal.owner_id,p_goal_id,'tree_grew',coalesce(v_locked,now()),jsonb_build_object('from_stage',v_old_stage,'to_stage',v_stage,'evaluation_period_id',v_period),v_goal.is_test
    where not exists(select 1 from public.goal_events where goal_id=p_goal_id and event_type='tree_grew' and details->>'evaluation_period_id'=v_period::text);
  end if;
  return v_period;
end;
$$;

create or replace function public.evaluate_goal_source_contribution()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_old_date date;v_new_date date;v_tz text;v_owner uuid;v_goal uuid;
begin
  v_owner:=case when tg_op='DELETE' then old.owner_id else new.owner_id end;
  v_goal:=case when tg_op='DELETE' then old.goal_id else new.goal_id end;
  select coalesce(timezone,'UTC') into v_tz from public.profiles where id=v_owner;
  if tg_op<>'INSERT' then v_old_date:=(old.occurred_at at time zone coalesce(v_tz,'UTC'))::date; end if;
  if tg_op<>'DELETE' then v_new_date:=(new.occurred_at at time zone coalesce(v_tz,'UTC'))::date; end if;
  if v_old_date is not null then perform public.evaluate_goal_period(old.goal_id,v_old_date,false); end if;
  if v_new_date is not null and (v_new_date is distinct from v_old_date or new.goal_id is distinct from old.goal_id) then
    perform public.evaluate_goal_period(new.goal_id,v_new_date,false);
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
create trigger zz_evaluate_goal_source_contribution
  after insert or update or delete on public.goal_source_contributions
  for each row execute function public.evaluate_goal_source_contribution();

-- Reconcile existing Nutrition associations. The unique key makes this safe to rerun.
insert into public.goal_source_contributions(
  owner_id,goal_id,source_record_type,source_record_id,contribution_type,value,unit_key,occurred_at,is_test
)
select l.owner_id,l.goal_id,'nutrition_entry',l.nutrition_entry_id,'explicit_occurrence',1,'count',e.occurred_at,e.is_test
from public.nutrition_entry_goals l join public.nutrition_entries e on e.id=l.nutrition_entry_id and e.owner_id=l.owner_id
where e.deleted_at is null and exists (
  select 1 from public.goal_rules r where r.goal_id=l.goal_id and r.owner_id=l.owner_id and r.measurement_type='count'
    and r.effective_from<=(e.occurred_at at time zone coalesce((select timezone from public.profiles where id=l.owner_id),'UTC'))::date
    and (r.effective_to is null or r.effective_to>=(e.occurred_at at time zone coalesce((select timezone from public.profiles where id=l.owner_id),'UTC'))::date)
) on conflict(goal_id,source_record_type,source_record_id) do nothing;

do $$ declare v record;v_tz text; begin
  for v in select distinct goal_id,owner_id,occurred_at from public.goal_source_contributions loop
    select coalesce(timezone,'UTC') into v_tz from public.profiles where id=v.owner_id;
    perform public.evaluate_goal_period(v.goal_id,(v.occurred_at at time zone coalesce(v_tz,'UTC'))::date,false);
  end loop;
end $$;

revoke all on function public.sync_nutrition_goal_contribution() from public,anon,authenticated;
revoke all on function public.sync_nutrition_entry_contributions() from public,anon,authenticated;
revoke all on function public.evaluate_goal_source_contribution() from public,anon,authenticated;

comment on table public.goal_source_contributions is
  'Reversible Goal effects derived from canonical module facts; never a duplicate History record.';
