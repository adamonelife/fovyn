-- A correction can reopen or fail the evaluation that originally earned growth.
-- The award and Tree high-water mark remain as historical facts; the current
-- evaluation state must still reflect the corrected canonical records.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.evaluate_goal_period(uuid,date,boolean)'::regprocedure) into v_definition;
  v_definition:=replace(v_definition,
    E'status=case\n      when goal_evaluation_periods.achievement_locked_at is not null then ''success''\n      when goal_evaluation_periods.failure_locked_at is not null then ''failed'' else excluded.status end,',
    'status=excluded.status,');
  if v_definition not like '%status=excluded.status,%' then
    raise exception 'Unable to install correction-aware Goal evaluation state';
  end if;
  execute v_definition;
end;
$$;
