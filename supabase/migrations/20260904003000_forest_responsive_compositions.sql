create table if not exists public.forest_environment_views (
  environment_key text not null,
  viewport_profile text not null check(viewport_profile in ('desktop','mobile')),
  calibration_state text not null check(calibration_state in ('draft','published')),
  position_x numeric not null default .5 check(position_x between 0 and 1),
  position_y numeric not null default .5 check(position_y between 0 and 1),
  zoom numeric not null default 1 check(zoom between .5 and 3),
  scrollable boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(environment_key,viewport_profile,calibration_state)
);
alter table public.forest_environment_views enable row level security;
revoke all on table public.forest_environment_views from anon,authenticated;
grant select on table public.forest_environment_views to anon,authenticated;
grant insert,update on table public.forest_environment_views to authenticated;
create policy "Published Forest framing is publicly readable" on public.forest_environment_views for select to anon,authenticated using(calibration_state='published');
create policy "Super Admin reads own Forest framing drafts" on public.forest_environment_views for select to authenticated using(calibration_state='draft' and (select auth.uid())=updated_by and private.is_super_admin());
create policy "Super Admin creates Forest framing" on public.forest_environment_views for insert to authenticated with check((select auth.uid())=updated_by and private.is_super_admin());
create policy "Super Admin updates Forest framing" on public.forest_environment_views for update to authenticated using(private.is_super_admin()) with check((select auth.uid())=updated_by and private.is_super_admin());
create index if not exists forest_environment_views_updated_by_idx on public.forest_environment_views(updated_by) where updated_by is not null;
insert into public.forest_environment_views(environment_key,viewport_profile,calibration_state,position_x,position_y,zoom,scrollable)
select environment_key,profile,'published',.5,.5,case when profile='mobile' then 1.35 else 1 end,profile='mobile'
from (select distinct split_part(environment_key,'@',1) environment_key from public.forest_environment_slots) environments
cross join (values('desktop'),('mobile')) profiles(profile)
on conflict do nothing;
