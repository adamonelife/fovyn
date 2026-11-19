-- Development only. Reuses Batch 1 tables; no data seed, Auth or policy changes.
begin;
create or replace function public.load_my_plan()
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ctx boolean:=(private.active_data_context()='test'); result jsonb;
begin
 if uid is null then raise exception using errcode='42501',message='Sign in to load your plan.'; end if;
 select jsonb_build_object(
 'settings',(select to_jsonb(s) from public.user_plan_settings s where owner_id=uid and is_test=ctx),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'owner_id',g.owner_id,'is_test',g.is_test,'title',g.title,'description',coalesce(g.description,''),'area_key',g.area_key,'starts_on',g.starts_on,'ends_on',g.ends_on,'updated_at',g.updated_at) order by g.created_at,g.id) from public.goals g where owner_id=uid and is_test=ctx),'[]'::jsonb),
 'milestones',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.goal_milestones m where owner_id=uid and is_test=ctx),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('scheduled_time',to_char(t.scheduled_time,'HH24:MI')) order by t.created_at,t.id) from public.tasks t where owner_id=uid and is_test=ctx),'[]'::jsonb)
 ) into result;
 return result;
end $$;

-- One action is one transaction, including a goal's presentation-area mapping.
-- Expected timestamps reject stale edits instead of silently overwriting them.
create or replace function public.save_plan_action(p_kind text,p_value jsonb,p_expected timestamptz default null,p_focus_area text default null,p_settings_expected timestamptz default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ctx boolean:=(private.active_data_context()='test'); rid uuid:=(p_value->>'id')::uuid; affected integer;
begin
 if uid is null or (p_value->>'owner_id')::uuid is distinct from uid or (p_value->>'is_test')::boolean is distinct from ctx then raise exception using errcode='42501',message='Account or data context changed. Sign in and reload.'; end if;
 if p_kind is null or p_kind not in ('goal','milestone','task','settings') then raise exception using errcode='22023',message='Unknown planning action.';end if;
 if p_kind<>'settings' and (rid is null or length(trim(p_value->>'title')) not between 1 and 120 or p_value->>'title' is null) then raise exception using errcode='22023',message='A valid identity and title are required.';end if;
 if p_kind='settings' then
  if nullif(trim(p_value->>'programme_name'),'') is null or p_value->>'starts_on' is null or p_value->>'target_on' is null then raise exception using errcode='22023',message='Programme name and dates are required.';end if;
  if p_expected is null then
   insert into public.user_plan_settings(owner_id,is_test,programme_name,starts_on,target_on,preferred_modules,dashboard_sections,area_preferences)
   values(uid,ctx,p_value->>'programme_name',(p_value->>'starts_on')::date,(p_value->>'target_on')::date,array(select jsonb_array_elements_text(p_value->'preferred_modules')),array(select jsonb_array_elements_text(p_value->'dashboard_sections')),jsonb_build_object('areas',p_value->'areas','goal_areas',p_value->'goal_areas'));
  else
   update public.user_plan_settings set programme_name=p_value->>'programme_name',starts_on=(p_value->>'starts_on')::date,target_on=(p_value->>'target_on')::date,preferred_modules=array(select jsonb_array_elements_text(p_value->'preferred_modules')),dashboard_sections=array(select jsonb_array_elements_text(p_value->'dashboard_sections')),area_preferences=jsonb_build_object('areas',p_value->'areas','goal_areas',p_value->'goal_areas') where owner_id=uid and is_test=ctx and updated_at=p_expected;
   get diagnostics affected=row_count;
   if affected<>1 then raise exception using errcode='40001',message='This plan changed elsewhere. Reload before saving again; your draft has been kept.';end if;
  end if;
 elsif p_kind='goal' then
  if (p_value->>'ends_on')::date < (p_value->>'starts_on')::date then raise exception using errcode='22023',message='Goal dates are reversed.';end if;
  if p_expected is null then
   insert into public.goals(id,owner_id,is_test,title,description,area_key,starts_on,ends_on)
   values(rid,uid,ctx,trim(p_value->>'title'),p_value->>'description',p_value->>'area_key',(p_value->>'starts_on')::date,(p_value->>'ends_on')::date);
  else
   update public.goals set title=trim(p_value->>'title'),description=p_value->>'description',area_key=p_value->>'area_key',starts_on=(p_value->>'starts_on')::date,ends_on=(p_value->>'ends_on')::date,updated_at=clock_timestamp() where id=rid and owner_id=uid and is_test=ctx and updated_at=p_expected;
   get diagnostics affected=row_count;
   if affected<>1 then raise exception using errcode='40001',message='This goal changed elsewhere. Reload before saving again; your draft has been kept.';end if;
  end if;
  if p_focus_area is not null then
   if p_settings_expected is null then
    insert into public.user_plan_settings(owner_id,is_test,area_preferences) values(uid,ctx,jsonb_build_object('goal_areas',jsonb_build_object(rid::text,p_focus_area)));
   else
    update public.user_plan_settings set area_preferences=jsonb_set(area_preferences,'{goal_areas}',coalesce(area_preferences->'goal_areas','{}'::jsonb)||jsonb_build_object(rid::text,p_focus_area)) where owner_id=uid and is_test=ctx and updated_at=p_settings_expected;
    get diagnostics affected=row_count;
    if affected<>1 then raise exception using errcode='40001',message='Programme preferences changed elsewhere. Reload before saving again; your draft has been kept.';end if;
   end if;
  end if;
 elsif p_kind='milestone' then
  if p_expected is null then
   insert into public.goal_milestones(id,owner_id,is_test,goal_id,title,due_on,completed_at) values(rid,uid,ctx,(p_value->>'goal_id')::uuid,trim(p_value->>'title'),(p_value->>'due_on')::date,(p_value->>'completed_at')::timestamptz);
  else
   update public.goal_milestones set goal_id=(p_value->>'goal_id')::uuid,title=trim(p_value->>'title'),due_on=(p_value->>'due_on')::date,completed_at=(p_value->>'completed_at')::timestamptz where id=rid and owner_id=uid and is_test=ctx and updated_at=p_expected;
   get diagnostics affected=row_count;
   if affected<>1 then raise exception using errcode='40001',message='This milestone changed elsewhere. Reload before saving again; your draft has been kept.';end if;
  end if;
 elsif p_kind='task' then
  if p_expected is null then
   insert into public.tasks(id,owner_id,is_test,goal_id,milestone_id,title,due_on,scheduled_on,scheduled_time,focus_on,status,blocked_reason,completed_at)
   values(rid,uid,ctx,(p_value->>'goal_id')::uuid,(p_value->>'milestone_id')::uuid,trim(p_value->>'title'),(p_value->>'due_on')::date,(p_value->>'scheduled_on')::date,(p_value->>'scheduled_time')::time,(p_value->>'focus_on')::date,p_value->>'status',p_value->>'blocked_reason',(p_value->>'completed_at')::timestamptz);
  else
   update public.tasks set goal_id=(p_value->>'goal_id')::uuid,milestone_id=(p_value->>'milestone_id')::uuid,title=trim(p_value->>'title'),due_on=(p_value->>'due_on')::date,scheduled_on=(p_value->>'scheduled_on')::date,scheduled_time=(p_value->>'scheduled_time')::time,focus_on=(p_value->>'focus_on')::date,status=p_value->>'status',blocked_reason=p_value->>'blocked_reason',completed_at=(p_value->>'completed_at')::timestamptz where id=rid and owner_id=uid and is_test=ctx and updated_at=p_expected;
   get diagnostics affected=row_count;
   if affected<>1 then raise exception using errcode='40001',message='This task changed elsewhere. Reload before saving again; your draft has been kept.';end if;
  end if;
 end if;
 return public.load_my_plan();
end $$;
revoke all on function public.load_my_plan(),public.save_plan_action(text,jsonb,timestamptz,text,timestamptz) from public,anon;
grant execute on function public.load_my_plan(),public.save_plan_action(text,jsonb,timestamptz,text,timestamptz) to authenticated;
commit;
