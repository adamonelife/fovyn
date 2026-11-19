-- Disposable synthetic scaffold only; not a migration or complete Supabase stack.
create role authenticated; create role anon; create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,private,public to authenticated,anon;
create table public.profiles(id uuid primary key);
create table public.goals(id uuid primary key, owner_id uuid not null references public.profiles(id),is_test boolean not null default false,title text not null,description text,area_key text not null default 'health',starts_on date not null default current_date,ends_on date,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),status text not null default 'active',forest_stage smallint not null default 1);
create table public.user_roles(user_id uuid,role text);
create function private.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles where user_id=auth.uid() and role='super_admin')$$;
create function private.active_data_context() returns text language sql stable security definer set search_path='' as $$select case when coalesce(current_setting('request.headers',true)::jsonb->>'x-fovyn-data-context','real')='test' and private.is_super_admin() then 'test' else 'real' end$$;
create function private.apply_test_provenance() returns trigger language plpgsql security invoker set search_path='' as $$begin if tg_op='UPDATE' and new.is_test is distinct from old.is_test then raise exception using errcode='42501',message='test_provenance_is_immutable';end if;if tg_op='INSERT' then new.is_test=(private.active_data_context()='test');end if;return new;end$$;
revoke all on function private.is_super_admin(),private.active_data_context(),private.apply_test_provenance() from public,anon;
grant execute on function private.is_super_admin(),private.active_data_context(),private.apply_test_provenance() to authenticated;
insert into public.profiles values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
insert into public.user_roles values('11111111-1111-4111-8111-111111111111','super_admin'),('22222222-2222-4222-8222-222222222222','super_admin');
alter table public.goals enable row level security;
create policy scoped_goals on public.goals to authenticated using(owner_id=auth.uid() and is_test=(private.active_data_context()='test'));
grant select,insert,update on public.goals to authenticated;
create trigger goals_test_provenance before insert or update of is_test on public.goals for each row execute function private.apply_test_provenance();
