-- Resolve PostgREST relationship ambiguity while keeping owner-matched foreign keys authoritative.
alter table public.grove_goals drop constraint if exists grove_goals_goal_id_fkey;
alter table public.grove_goals drop constraint if exists grove_goals_grove_id_fkey;
alter table public.grove_events drop constraint if exists grove_events_grove_id_fkey;

-- Physical Goal deletion cleans up only organisational membership rows. The Goal lifecycle
-- normally archives history, but this keeps legitimate empty-Goal deletion referentially clean.
alter table public.grove_goals drop constraint if exists grove_goals_owned_goal_fk;
alter table public.grove_goals
  add constraint grove_goals_owned_goal_fk
  foreign key (goal_id, owner_id)
  references public.goals(id, owner_id)
  on delete cascade;

-- Ownership and real/test provenance must be one policy predicate. Separate permissive
-- policies are ORed by Postgres and would weaken owner isolation.
drop policy if exists "Owners manage their Groves" on public.groves;
drop policy if exists "test_context_isolation" on public.groves;
create policy "Owners manage their Groves"
on public.groves for all to authenticated
using (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
)
with check (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
);

drop policy if exists "Owners manage Grove memberships" on public.grove_goals;
drop policy if exists "test_context_isolation" on public.grove_goals;
create policy "Owners manage Grove memberships"
on public.grove_goals for all to authenticated
using (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
)
with check (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
);

drop policy if exists "Owners add Grove history" on public.grove_events;
drop policy if exists "Owners view Grove history" on public.grove_events;
drop policy if exists "test_context_isolation" on public.grove_events;
create policy "Owners add Grove history"
on public.grove_events for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
);
create policy "Owners view Grove history"
on public.grove_events for select to authenticated
using (
  (select auth.uid()) = owner_id
  and is_test = (private.active_data_context() = 'test')
);

revoke all on public.groves, public.grove_goals, public.grove_events from anon;
revoke truncate, references, trigger on public.groves, public.grove_goals, public.grove_events from authenticated;
grant select, insert, update, delete on public.groves, public.grove_goals to authenticated;
grant select, insert on public.grove_events to authenticated;

create or replace function public.delete_grove(p_grove_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'Authentication required'; end if;

  delete from public.groves
  where id = p_grove_id
    and owner_id = v_owner;

  if not found then raise exception 'Grove is not available to delete'; end if;
end
$$;

revoke all on function public.delete_grove(uuid) from public, anon;
grant execute on function public.delete_grove(uuid) to authenticated;

comment on function public.delete_grove(uuid) is
  'Deletes one owned Grove and its organisational memberships; canonical Goals and Trees remain.';
