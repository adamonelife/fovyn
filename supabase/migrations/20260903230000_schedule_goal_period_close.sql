create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.close_all_due_goal_evaluation_periods()
returns integer language plpgsql security definer set search_path=''
as $$
declare v record;v_count int:=0;v_timezone text;v_today date;
begin
  for v in select g.id,g.owner_id from public.goals g where g.status='active' loop
    select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=v.owner_id;
    v_today:=(now() at time zone coalesce(v_timezone,'UTC'))::date;
    perform public.evaluate_goal_period(v.id,v_today-1,false);
    v_count:=v_count+1;
  end loop;
  for v in select distinct e.goal_id,e.period_end from public.goal_evaluation_periods e
    where e.closed_at is null and e.period_end<current_date loop
    perform public.evaluate_goal_period(v.goal_id,v.period_end,true);
  end loop;
  return v_count;
end;
$$;

revoke all on function private.close_all_due_goal_evaluation_periods() from public,anon,authenticated;

select cron.schedule(
  'fovyn-close-goal-periods',
  '15 * * * *',
  'select private.close_all_due_goal_evaluation_periods()'
);
