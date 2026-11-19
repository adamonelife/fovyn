-- Additive, owner-scoped Weekly and Reading domains. No historic rows changed.
begin;
create table public.weekly_goal_versions (
 owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 is_test boolean not null default false,
 effective_week date not null check (extract(isodow from effective_week)=1),
 categories jsonb not null check (jsonb_typeof(categories)='array'),
 primary key(owner_id,is_test,effective_week)
);
create table public.reading_books (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 is_test boolean not null default false, title text not null check(length(trim(title)) between 1 and 500), author text not null default '', edition text not null default '',
 genre text not null default 'unspecified' check(genre in ('fiction','non-fiction','unspecified')),
 format text not null default 'book' check(format in ('book','audiobook')),
 status text not null default 'unspecified' check(status in ('reading','want','completed','paused','unspecified')),
 deleted_at timestamptz, unique(id,owner_id,is_test)
);
create unique index reading_book_identity on public.reading_books(owner_id,is_test,lower(trim(title)),lower(trim(author)),lower(trim(edition)),format) where deleted_at is null;
create table public.weekly_activity_entries (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 is_test boolean not null default false,category_key text not null check(length(category_key) between 1 and 120),amount numeric not null check(amount>0 and amount<100000),
 occurred_at timestamptz not null,book_id uuid,medium text check(medium in ('reading','audiobook')),deleted_at timestamptz,
 foreign key(book_id,owner_id,is_test) references public.reading_books(id,owner_id,is_test),
 check(category_key='reading' or (book_id is null and medium is null))
);
create index weekly_activity_owner_time on public.weekly_activity_entries(owner_id,is_test,occurred_at) where deleted_at is null;
do $$ declare t text; begin
 foreach t in array array['weekly_goal_versions','reading_books','weekly_activity_entries'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy weekly_owner on public.%I for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))',t);
  execute format('create policy weekly_context on public.%I as restrictive for all to authenticated using (is_test=((select private.active_data_context())=''test'')) with check (is_test=((select private.active_data_context())=''test''))',t);
  execute format('create policy weekly_test_cleanup on public.%I as restrictive for delete to authenticated using (is_test and (select private.is_super_admin()))',t);
  execute format('create trigger weekly_provenance before insert or update of is_test on public.%I for each row execute function private.apply_test_provenance()',t);
 end loop;
end $$;
create policy weekly_future_inserts on public.weekly_goal_versions as restrictive for insert to authenticated with check(effective_week>=date_trunc('week',now() at time zone 'Asia/Makassar')::date+7);
create policy weekly_future_updates on public.weekly_goal_versions as restrictive for update to authenticated using(effective_week>=date_trunc('week',now() at time zone 'Asia/Makassar')::date+7) with check(effective_week>=date_trunc('week',now() at time zone 'Asia/Makassar')::date+7);
-- Contextual cleanup is intentionally delegated to the existing owner-only Test Mode routine.
create or replace function public.clear_weekly_test_data()
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_super_admin() or private.active_data_context()<>'test' then raise exception using errcode='42501',message='test_mode_required'; end if;
 delete from public.weekly_activity_entries where owner_id=auth.uid() and is_test;
 delete from public.reading_books where owner_id=auth.uid() and is_test;
 delete from public.weekly_goal_versions where owner_id=auth.uid() and is_test;
end $$;
revoke all on function public.clear_weekly_test_data() from public,anon;
grant execute on function public.clear_weekly_test_data() to authenticated;
commit;
