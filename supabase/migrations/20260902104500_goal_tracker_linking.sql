create or replace function public.link_tracking_record_goals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    delete from public.goal_contributions
    where record_id = new.id and owner_id = new.owner_id;
    return new;
  end if;

  insert into public.goal_contributions(owner_id, goal_id, record_id)
  select new.owner_id, gt.goal_id, new.id
  from public.goal_trackers gt
  join public.goals g on g.id = gt.goal_id and g.owner_id = new.owner_id
  where gt.owner_id = new.owner_id
    and gt.tracker_id = new.tracker_id
    and new.occurred_at::date >= g.starts_on
    and (g.ends_on is null or new.occurred_at::date <= g.ends_on)
  on conflict do nothing;

  delete from public.goal_contributions gc
  using public.goals g, public.goal_trackers gt
  where gc.record_id = new.id
    and gc.owner_id = new.owner_id
    and g.id = gc.goal_id
    and gt.goal_id = g.id
    and gt.tracker_id = new.tracker_id
    and (new.occurred_at::date < g.starts_on or (g.ends_on is not null and new.occurred_at::date > g.ends_on));
  return new;
end;
$$;

drop trigger if exists link_tracking_record_goals on public.tracking_records;
create trigger link_tracking_record_goals
after insert or update of tracker_id, occurred_at, deleted_at on public.tracking_records
for each row execute function public.link_tracking_record_goals();

revoke execute on function public.link_tracking_record_goals() from public, anon, authenticated;

create or replace function public.create_goal_bundle(p_input jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_goal uuid;
  v_tracker uuid := nullif(p_input->>'tracker_id','')::uuid;
  v_measurement text := p_input->>'measurement_type';
  v_unit text := nullif(p_input->>'unit_key','');
  v_custom text := nullif(btrim(coalesce(p_input->>'custom_unit','')),'');
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(coalesce(p_input->>'title','')),'') is null then raise exception 'A Goal name is required'; end if;
  if (p_input->>'starts_on')::date < (now() at time zone coalesce((select timezone from public.profiles where id=v_owner),'UTC'))::date - 7 then raise exception 'Goal start date must be within the last seven days'; end if;

  if v_tracker is not null then
    select id, measurement_type, unit_key, custom_unit
    into v_tracker, v_measurement, v_unit, v_custom
    from public.trackers
    where id=v_tracker and owner_id=v_owner and status <> 'archived';
    if v_tracker is null then raise exception 'That Log item is not available'; end if;
  else
    if v_measurement='custom' and v_custom is null then raise exception 'A custom unit is required'; end if;
    if v_measurement<>'custom' and v_unit is null then raise exception 'A measurement unit is required'; end if;
  end if;

  insert into public.goals(owner_id,title,description,area_key,subcategory_id,goal_kind,presentation_priority,negotiability,starts_on,ends_on)
  values(v_owner,btrim(p_input->>'title'),nullif(btrim(coalesce(p_input->>'description','')),''),p_input->>'area_key',nullif(p_input->>'subcategory_id','')::uuid,p_input->>'goal_kind',p_input->>'presentation_priority',p_input->>'negotiability',(p_input->>'starts_on')::date,nullif(p_input->>'ends_on','')::date)
  returning id into v_goal;

  if v_tracker is null then
    insert into public.trackers(owner_id,name,module,area_key,subcategory_id,measurement_type,unit_key,custom_unit)
    values(v_owner,btrim(coalesce(nullif(p_input->>'tracker_name',''),p_input->>'title')),coalesce(nullif(p_input->>'tracker_module',''),'metrics'),p_input->>'area_key',nullif(p_input->>'subcategory_id','')::uuid,v_measurement,case when v_measurement='custom' then null else v_unit end,case when v_measurement='custom' then v_custom else null end)
    returning id into v_tracker;
  end if;

  insert into public.goal_rules(goal_id,owner_id,measurement_type,unit_key,custom_unit,target_operator,target_min,target_max,period,aggregation,effective_from)
  values(v_goal,v_owner,v_measurement,case when v_measurement='custom' then null else v_unit end,case when v_measurement='custom' then v_custom else null end,p_input->>'target_operator',(p_input->>'target_min')::numeric,case when p_input->>'target_operator'='range' then nullif(p_input->>'target_max','')::numeric else null end,p_input->>'period',p_input->>'aggregation',(p_input->>'starts_on')::date);

  insert into public.goal_trackers(goal_id,tracker_id,owner_id) values(v_goal,v_tracker,v_owner);
  insert into public.goal_contributions(owner_id,goal_id,record_id)
  select v_owner,v_goal,r.id from public.tracking_records r
  where r.owner_id=v_owner and r.tracker_id=v_tracker and r.deleted_at is null
    and r.occurred_at::date >= (p_input->>'starts_on')::date
    and (nullif(p_input->>'ends_on','') is null or r.occurred_at::date <= (p_input->>'ends_on')::date)
  on conflict do nothing;
  return v_goal;
end;
$$;

revoke execute on function public.create_goal_bundle(jsonb) from public, anon;
grant execute on function public.create_goal_bundle(jsonb) to authenticated;

create or replace function public.relink_goal_tracker_records(p_goal_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.goal_contributions where goal_id=p_goal_id and owner_id=auth.uid();
  insert into public.goal_contributions(owner_id,goal_id,record_id)
  select auth.uid(),g.id,r.id
  from public.goals g
  join public.goal_trackers gt on gt.goal_id=g.id and gt.owner_id=auth.uid()
  join public.tracking_records r on r.tracker_id=gt.tracker_id and r.owner_id=auth.uid() and r.deleted_at is null
  where g.id=p_goal_id and g.owner_id=auth.uid()
    and r.occurred_at::date >= g.starts_on
    and (g.ends_on is null or r.occurred_at::date <= g.ends_on)
  on conflict do nothing;
$$;

revoke execute on function public.relink_goal_tracker_records(uuid) from public, anon;
grant execute on function public.relink_goal_tracker_records(uuid) to authenticated;
