drop policy if exists "Super Admin updates Tree scale calibration" on public.forest_tree_calibrations;
create policy "Super Admin updates Tree scale calibration"
on public.forest_tree_calibrations
for update
to authenticated
using(private.is_super_admin())
with check((select auth.uid())=updated_by and private.is_super_admin());
