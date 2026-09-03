create or replace function public.current_user_capabilities()
returns table(super_admin boolean)
language sql stable security invoker set search_path=''
as $$select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='super_admin')$$;
revoke all on function public.current_user_capabilities() from public,anon;
grant execute on function public.current_user_capabilities() to authenticated;
