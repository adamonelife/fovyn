-- Event-driven Goal evaluation. A period is anchored to the Goal start date,
-- not to an arbitrary calendar boundary.
create table if not exists public.goal_evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  rule_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open','success','failed')),
  actual_value numeric not null default 0,
  achievement_locked_at timestamptz,
  failure_locked_at timestamptz,
  evaluated_at timestamptz not null default now(),
  closed_at timestamptz,
  is_test boolean not null default false,
  constraint goal_evaluation_periods_goal_owner_fkey foreign key (goal_id,owner_id) references public.goals(id,owner_id) on delete cascade,
  constraint goal_evaluation_periods_rule_owner_fkey foreign key (rule_id,owner_id) references public.goal_rules(id,owner_id) on delete cascade,
  constraint goal_evaluation_period_dates check (period_end >= period_start),
  unique(goal_id,rule_id,period_start,period_end)
);

create table if not exists public.goal_growth_awards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  evaluation_period_id uuid,
  award_type text not null check (award_type in ('first_contribution','second_contribution','successful_period')),
  tree_stage smallint not null check (tree_stage between 2 and 27),
  earned_at timestamptz not null,
  details jsonb not null default '{}'::jsonb,
  is_test boolean not null default false,
  constraint goal_growth_awards_goal_owner_fkey foreign key (goal_id,owner_id) references public.goals(id,owner_id) on delete cascade,
  constraint goal_growth_awards_period_fkey foreign key (evaluation_period_id) references public.goal_evaluation_periods(id) on delete cascade,
  unique(goal_id,award_type,evaluation_period_id),
  unique(goal_id,tree_stage)
);

create index if not exists goal_evaluation_periods_owner_goal_idx on public.goal_evaluation_periods(owner_id,goal_id,period_start desc);
create index if not exists goal_growth_awards_owner_goal_idx on public.goal_growth_awards(owner_id,goal_id,earned_at desc);

alter table public.goal_evaluation_periods enable row level security;
alter table public.goal_growth_awards enable row level security;
create policy "Owners read Goal evaluations" on public.goal_evaluation_periods for select using (owner_id=auth.uid());
create policy "Owners read Goal growth awards" on public.goal_growth_awards for select using (owner_id=auth.uid());

alter table public.goal_events drop constraint if exists goal_events_event_type_check;
alter table public.goal_events add constraint goal_events_event_type_check
check (event_type in ('planted','pruned','dormant','awakened','completed','ended','tree_grew'));

create or replace function public.goal_period_bounds(p_goal_start date,p_period text,p_occurrence date)
returns table(period_start date,period_end date)
language sql immutable set search_path=''
as $$
  with duration as (
    select case p_period when 'day' then 1 when 'week' then 7 when 'month' then 30 when 'year' then 365 else 1 end::int days
  ), anchored as (
    select days, greatest(0,floor((p_occurrence-p_goal_start)::numeric/days)::int) cycle from duration
  )
  select p_goal_start+(cycle*days),p_goal_start+(cycle*days)+(days-1) from anchored;
$$;

create or replace function public.forest_stage_for_goal(p_goal_id uuid)
returns smallint
language plpgsql security definer set search_path=''
as $$
declare
  v_goal public.goals%rowtype; v_count int; v_success int; v_resolved int;
  v_eligible_days int; v_consistency numeric; v_stage int:=1; v_required numeric;
  v_thresholds int[]:=array[7,14,21,28,42,56,70,84,98,112,140,168,196,224,252,280,308,365,426,487,548,609,670,730];
  i int;
begin
  select * into v_goal from public.goals where id=p_goal_id;
  if not found then return 1; end if;
  select count(*) into v_count from public.goal_contributions gc join public.tracking_records r on r.id=gc.record_id
   where gc.goal_id=p_goal_id and r.deleted_at is null and not exists (
     select 1 from public.goal_dormancy_periods d where d.goal_id=p_goal_id
     and r.occurred_at>=d.dormant_from and r.occurred_at<coalesce(d.awakened_at,'infinity'::timestamptz));
  if v_count=0 then return greatest(1,v_goal.forest_stage); end if;
  if v_count=1 then return greatest(2,v_goal.forest_stage); end if;
  v_stage:=3;
  select count(*) filter(where status='success'),count(*) filter(where status<>'open')
    into v_success,v_resolved from public.goal_evaluation_periods where goal_id=p_goal_id;
  if v_success=0 then return greatest(v_stage,v_goal.forest_stage); end if;
  v_eligible_days:=greatest(0,current_date-v_goal.starts_on+1-coalesce((select sum(
    greatest(0,least(current_date,coalesce(d.awakened_at::date,current_date))-greatest(v_goal.starts_on,d.dormant_from::date)+1))
    from public.goal_dormancy_periods d where d.goal_id=p_goal_id),0));
  v_consistency:=case when v_resolved=0 then 100 else 100.0*v_success/v_resolved end;
  v_stage:=4;
  for i in 1..array_length(v_thresholds,1) loop
    v_required:=case when i+3>=22 then 85 when i+3>=16 then 80 when i+3>=10 then 75 else 70 end;
    if v_eligible_days>=v_thresholds[i] and v_consistency>=v_required then v_stage:=least(27,i+3); end if;
  end loop;
  return greatest(v_stage,v_goal.forest_stage);
end;
$$;

create or replace function public.evaluate_goal_period(p_goal_id uuid,p_occurrence date,p_force_close boolean default false)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_goal public.goals%rowtype; v_rule public.goal_rules%rowtype; v_timezone text;
  v_start date;v_end date;v_actual numeric:=0;v_now_date date;v_status text:='open';v_period uuid;
  v_locked timestamptz;v_failed timestamptz;v_stage smallint;v_old_stage smallint;v_earned timestamptz;
begin
  select * into v_goal from public.goals where id=p_goal_id;
  if not found then return null; end if;
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=v_goal.owner_id;
  v_now_date:=(now() at time zone coalesce(v_timezone,'UTC'))::date;
  select * into v_rule from public.goal_rules where goal_id=p_goal_id and effective_from<=p_occurrence
    and (effective_to is null or effective_to>=p_occurrence) order by effective_from desc limit 1;
  if not found then return null; end if;
  select b.period_start,b.period_end into v_start,v_end from public.goal_period_bounds(v_goal.starts_on,v_rule.period,p_occurrence) b;
  v_start:=greatest(v_start,v_goal.starts_on,v_rule.effective_from);
  v_end:=least(v_end,coalesce(v_goal.ends_on,v_end),coalesce(v_rule.effective_to,v_end));
  select coalesce(case v_rule.aggregation when 'count' then count(*)::numeric when 'latest' then
    (array_agg(r.value order by r.occurred_at desc))[1] when 'average' then avg(r.value) else sum(r.value) end,0),
    max(r.occurred_at) into v_actual,v_earned
  from public.goal_contributions gc join public.tracking_records r on r.id=gc.record_id
  where gc.goal_id=p_goal_id and r.deleted_at is null and (r.occurred_at at time zone coalesce(v_timezone,'UTC'))::date between v_start and v_end
    and not exists(select 1 from public.goal_dormancy_periods d where d.goal_id=p_goal_id and r.occurred_at>=d.dormant_from and r.occurred_at<coalesce(d.awakened_at,'infinity'::timestamptz));
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
  insert into public.goal_evaluation_periods(owner_id,goal_id,rule_id,period_start,period_end,status,actual_value,
    achievement_locked_at,failure_locked_at,evaluated_at,closed_at,is_test)
  values(v_goal.owner_id,p_goal_id,v_rule.id,v_start,v_end,v_status,v_actual,v_locked,v_failed,now(),
    case when p_force_close or v_end<v_now_date then now() end,v_goal.is_test)
  on conflict(goal_id,rule_id,period_start,period_end) do update set
    actual_value=excluded.actual_value,evaluated_at=now(),status=case
      when goal_evaluation_periods.achievement_locked_at is not null then 'success'
      when goal_evaluation_periods.failure_locked_at is not null then 'failed' else excluded.status end,
    achievement_locked_at=coalesce(goal_evaluation_periods.achievement_locked_at,excluded.achievement_locked_at),
    failure_locked_at=coalesce(goal_evaluation_periods.failure_locked_at,excluded.failure_locked_at),
    closed_at=coalesce(goal_evaluation_periods.closed_at,excluded.closed_at)
  returning id,status,achievement_locked_at into v_period,v_status,v_locked;
  v_old_stage:=v_goal.forest_stage;
  v_stage:=public.forest_stage_for_goal(p_goal_id);
  if v_status='success' then v_stage:=greatest(v_stage,4); end if;
  if v_stage>v_old_stage then
    update public.goals set forest_stage=v_stage,forest_stage_updated_at=coalesce(v_locked,now()),updated_at=now() where id=p_goal_id and forest_stage<v_stage;
    insert into public.goal_growth_awards(owner_id,goal_id,evaluation_period_id,award_type,tree_stage,earned_at,details,is_test)
    values(v_goal.owner_id,p_goal_id,v_period,case v_stage when 2 then 'first_contribution' when 3 then 'second_contribution' else 'successful_period' end,v_stage,coalesce(v_locked,v_earned,now()),jsonb_build_object('from_stage',v_old_stage,'period_start',v_start,'period_end',v_end),v_goal.is_test)
    on conflict do nothing;
    insert into public.goal_events(owner_id,goal_id,event_type,occurred_at,details,is_test)
    select v_goal.owner_id,p_goal_id,'tree_grew',coalesce(v_locked,now()),jsonb_build_object('from_stage',v_old_stage,'to_stage',v_stage,'evaluation_period_id',v_period),v_goal.is_test
    where not exists(select 1 from public.goal_events where goal_id=p_goal_id and event_type='tree_grew' and details->>'evaluation_period_id'=v_period::text);
  end if;
  return v_period;
end;
$$;

create or replace function public.evaluate_tracking_record_goals()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v record;v_date date;v_tz text;v_owner uuid;v_tracker uuid;
begin
  v_owner:=coalesce(new.owner_id,old.owner_id);v_tracker:=coalesce(new.tracker_id,old.tracker_id);
  select coalesce(timezone,'UTC') into v_tz from public.profiles where id=v_owner;
  for v in select distinct gt.goal_id from public.goal_trackers gt where gt.owner_id=v_owner and gt.tracker_id=v_tracker loop
    if tg_op<>'INSERT' then v_date:=(old.occurred_at at time zone coalesce(v_tz,'UTC'))::date;perform public.evaluate_goal_period(v.goal_id,v_date,false);end if;
    if tg_op<>'DELETE' then v_date:=(new.occurred_at at time zone coalesce(v_tz,'UTC'))::date;perform public.evaluate_goal_period(v.goal_id,v_date,false);end if;
  end loop;
  return coalesce(new,old);
end;
$$;

drop trigger if exists zz_evaluate_tracking_record_goals on public.tracking_records;
create trigger zz_evaluate_tracking_record_goals after insert or update or delete on public.tracking_records
for each row execute function public.evaluate_tracking_record_goals();

create or replace function public.close_due_goal_evaluation_periods(p_as_of date default current_date)
returns integer language plpgsql security invoker set search_path=''
as $$
declare v record;v_count int:=0;
begin
  for v in select distinct g.id goal_id,e.period_end from public.goals g join public.goal_evaluation_periods e on e.goal_id=g.id
    where g.owner_id=auth.uid() and e.closed_at is null and e.period_end<p_as_of loop
    perform public.evaluate_goal_period(v.goal_id,v.period_end,true);v_count:=v_count+1;
  end loop;return v_count;
end;
$$;

revoke all on function public.evaluate_goal_period(uuid,date,boolean) from public,anon,authenticated;
revoke all on function public.forest_stage_for_goal(uuid) from public,anon,authenticated;
revoke all on function public.goal_period_bounds(date,text,date) from public,anon;
grant execute on function public.goal_period_bounds(date,text,date) to authenticated;
revoke all on function public.close_due_goal_evaluation_periods(date) from public,anon;
grant execute on function public.close_due_goal_evaluation_periods(date) to authenticated;

-- Establish canonical state for existing data without relying on a page load.
do $$
declare v record;v_tz text;
begin
  for v in select distinct gc.goal_id,r.occurred_at,g.owner_id from public.goal_contributions gc
    join public.tracking_records r on r.id=gc.record_id and r.deleted_at is null
    join public.goals g on g.id=gc.goal_id order by r.occurred_at loop
    select coalesce(timezone,'UTC') into v_tz from public.profiles where id=v.owner_id;
    perform public.evaluate_goal_period(v.goal_id,(v.occurred_at at time zone coalesce(v_tz,'UTC'))::date,false);
  end loop;
end;
$$;

comment on table public.goal_evaluation_periods is 'Stable, start-date-anchored Goal evaluation windows; achievement_locked_at records the first conclusive success.';
comment on table public.goal_growth_awards is 'Idempotent, non-regressing Tree growth awards derived from Goal evaluations.';
