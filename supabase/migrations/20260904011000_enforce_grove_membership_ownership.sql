-- Membership policy states both sides of the ownership rule explicitly; composite foreign
-- keys remain a second line of defence and keep PostgREST relationships unambiguous.
drop policy if exists "Owners manage Grove memberships" on public.grove_goals;
create policy "Owners manage Grove memberships"
on public.grove_goals for all to authenticated
using (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
  and exists (
    select 1 from public.groves grove
    where grove.id = grove_id
      and grove.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.goals goal
    where goal.id = goal_id
      and goal.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
  and exists (
    select 1 from public.groves grove
    where grove.id = grove_id
      and grove.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.goals goal
    where goal.id = goal_id
      and goal.owner_id = (select auth.uid())
  )
);
