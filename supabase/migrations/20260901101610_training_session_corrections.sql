alter table public.training_sessions
  add column if not exists session_type text not null default 'normal'
  constraint training_sessions_session_type_check check (session_type in ('normal','light','rehab'));

create or replace function public.correct_training_session(
  p_session_id uuid,
  p_session jsonb,
  p_exercises jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_exercise jsonb;
  v_set jsonb;
  v_session_exercise_id uuid;
  v_exercise_id uuid;
  v_now timestamptz := now();
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.training_sessions where id=p_session_id and owner_id=v_owner) then raise exception 'Training session not found'; end if;
  if coalesce(p_session->>'session_type','') not in ('normal','light','rehab') then raise exception 'Invalid session type'; end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises)=0 then raise exception 'A Training session needs at least one exercise'; end if;

  update public.training_sessions set
    performed_on=(p_session->>'performed_on')::date,
    workout_type=trim(p_session->>'workout_type'),
    variant=trim(p_session->>'variant'),
    session_type=p_session->>'session_type',
    bodyweight_kg=nullif(p_session->>'bodyweight_kg','')::numeric,
    duration_min=nullif(p_session->>'duration_min','')::numeric,
    watch_calories=nullif(p_session->>'watch_calories','')::numeric,
    energy=nullif(p_session->>'energy','')::numeric,
    sleep_hours=nullif(p_session->>'sleep_hours','')::numeric,
    notes=coalesce(p_session->>'notes',''),
    source_payload=coalesce(source_payload,'{}'::jsonb)||jsonb_build_object('corrected_at',v_now,'training_mode',p_session->>'session_type')
  where id=p_session_id and owner_id=v_owner;

  delete from public.training_session_exercises where session_id=p_session_id;
  for v_exercise in select value from jsonb_array_elements(p_exercises)
  loop
    v_exercise_id=(v_exercise->>'exercise_id')::uuid;
    if not exists(select 1 from public.training_exercises where id=v_exercise_id and owner_id=v_owner) then raise exception 'Exercise is not available'; end if;
    insert into public.training_session_exercises(session_id,exercise_id,position,slot_name,exercise_name_snapshot,rpe,notes,source_payload)
    values(p_session_id,v_exercise_id,(v_exercise->>'position')::smallint,coalesce(v_exercise->>'slot',''),coalesce(v_exercise->>'name',''),nullif(v_exercise->>'rpe','')::numeric,coalesce(v_exercise->>'notes',''),jsonb_build_object('source','corrected_in_fovyn','corrected_at',v_now))
    returning id into v_session_exercise_id;
    for v_set in select value from jsonb_array_elements(coalesce(v_exercise->'sets','[]'::jsonb))
    loop
      insert into public.training_sets(session_exercise_id,set_number,load_kg,load_label,target_value,completed)
      values(v_session_exercise_id,(v_set->>'set_number')::smallint,nullif(v_set->>'load_kg','')::numeric,nullif(v_set->>'load_label',''),nullif(v_set->>'target_value','')::numeric,true);
    end loop;
  end loop;
end;
$$;

revoke execute on function public.correct_training_session(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.correct_training_session(uuid,jsonb,jsonb) to authenticated;
