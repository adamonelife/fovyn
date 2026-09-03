create table if not exists public.forest_environment_slots (
  environment_key text not null,
  slot_id text not null,
  calibration_state text not null check (calibration_state in ('draft','published')),
  source_x numeric not null check (source_x between 0 and 1),
  source_y numeric not null check (source_y between 0 and 1),
  depth text not null check (depth in ('far','mid','near')),
  tree_scale numeric not null check (tree_scale between .1 and 3),
  z_index integer not null check (z_index between 0 and 999),
  label_anchor text not null check (label_anchor in ('left','centre','right')),
  label_offset_x numeric not null default 0 check (label_offset_x between -.5 and .5),
  label_offset_y numeric not null default .015 check (label_offset_y between -.5 and .5),
  card_direction text not null default 'auto' check (card_direction in ('auto','left','right','above','below')),
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (environment_key,slot_id,calibration_state)
);

alter table public.forest_environment_slots enable row level security;
revoke all on table public.forest_environment_slots from anon,authenticated;
grant select on table public.forest_environment_slots to anon,authenticated;
grant insert,update,delete on table public.forest_environment_slots to authenticated;

create policy "Published Forest calibration is readable"
on public.forest_environment_slots for select
to anon,authenticated
using (calibration_state='published');

create policy "Super Admin reads draft Forest calibration"
on public.forest_environment_slots for select
to authenticated
using ((select auth.uid())=updated_by and private.is_super_admin());

create policy "Super Admin manages Forest calibration"
on public.forest_environment_slots for insert
to authenticated
with check ((select auth.uid())=updated_by and private.is_super_admin());

create policy "Super Admin updates Forest calibration"
on public.forest_environment_slots for update
to authenticated
using ((select auth.uid())=updated_by and private.is_super_admin())
with check ((select auth.uid())=updated_by and private.is_super_admin());

create policy "Super Admin removes draft Forest calibration"
on public.forest_environment_slots for delete
to authenticated
using (calibration_state='draft' and (select auth.uid())=updated_by and private.is_super_admin());

create index if not exists forest_environment_slots_published_idx
on public.forest_environment_slots(environment_key,slot_id)
where calibration_state='published' and enabled;

comment on table public.forest_environment_slots is 'Source-artwork-space Forest slot calibration. Production reads published rows; Super Admin edits drafts.';
