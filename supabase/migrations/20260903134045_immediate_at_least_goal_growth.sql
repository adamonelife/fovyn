-- The active Goal rule owns the complete anchored evaluation period. A rule
-- edited part-way through a period must not hide qualifying records from the
-- start of that same period. Closed historical rules remain clipped to their
-- own effective range.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.evaluate_goal_period(uuid,date,boolean)'::regprocedure)
    into v_definition;
  v_definition:=replace(
    v_definition,
    'v_start := greatest(v_start, v_goal.starts_on, v_rule.effective_from);',
    E'v_start := greatest(\n    v_start,\n    v_goal.starts_on,\n    case when v_rule.effective_to is null then v_start else v_rule.effective_from end\n  );'
  );
  -- Support the compact formatting of the original checked-in definition.
  v_definition:=replace(
    v_definition,
    'v_start:=greatest(v_start,v_goal.starts_on,v_rule.effective_from);',
    'v_start:=greatest(v_start,v_goal.starts_on,case when v_rule.effective_to is null then v_start else v_rule.effective_from end);'
  );
  if v_definition not like '%case when v_rule.effective_to is null then v_start else v_rule.effective_from end%' then
    raise exception 'Unable to install anchored active-rule Goal evaluation';
  end if;
  execute v_definition;
end;
$$;

comment on function public.evaluate_goal_period(uuid,date,boolean) is
  'Canonical event-driven Goal evaluation. Active At-Least rules evaluate the full start-date-anchored period and award at most one Growth Ring for that period.';
