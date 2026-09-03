drop policy if exists "Published Forest calibration is readable" on public.forest_environment_slots;
drop policy if exists "Super Admin reads draft Forest calibration" on public.forest_environment_slots;

create policy "Published Forest calibration is publicly readable"
on public.forest_environment_slots for select
to anon
using (calibration_state='published');

create policy "Authenticated users read live calibration and Super Admin drafts"
on public.forest_environment_slots for select
to authenticated
using (calibration_state='published' or ((select auth.uid())=updated_by and private.is_super_admin()));

create index if not exists forest_environment_slots_updated_by_idx
on public.forest_environment_slots(updated_by)
where updated_by is not null;
