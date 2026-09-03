revoke all on function public.evaluate_tracking_record_goals() from public,anon,authenticated;

drop policy if exists "Owners read Goal evaluations" on public.goal_evaluation_periods;
create policy "Owners read Goal evaluations" on public.goal_evaluation_periods for select using (owner_id=(select auth.uid()));
drop policy if exists "Owners read Goal growth awards" on public.goal_growth_awards;
create policy "Owners read Goal growth awards" on public.goal_growth_awards for select using (owner_id=(select auth.uid()));

create index if not exists goal_evaluation_periods_goal_owner_idx on public.goal_evaluation_periods(goal_id,owner_id);
create index if not exists goal_evaluation_periods_rule_owner_idx on public.goal_evaluation_periods(rule_id,owner_id);
create index if not exists goal_growth_awards_goal_owner_idx on public.goal_growth_awards(goal_id,owner_id);
create index if not exists goal_growth_awards_period_idx on public.goal_growth_awards(evaluation_period_id);
