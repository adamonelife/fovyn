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
