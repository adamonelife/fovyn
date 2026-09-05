-- Harden environment provenance and cover the composite lifecycle foreign key.

create index if not exists goal_lifecycle_events_goal_owner_idx
  on public.goal_lifecycle_events (goal_id, owner_id);

create or replace function private.assign_profile_app_environment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.app_environment := private.active_app_environment();
  else
    new.app_environment := old.app_environment;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_profile_app_environment on public.profiles;
create trigger assign_profile_app_environment
before insert or update of app_environment on public.profiles
for each row execute function private.assign_profile_app_environment();
