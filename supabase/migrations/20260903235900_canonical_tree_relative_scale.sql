create table if not exists public.forest_tree_calibrations (
  stage smallint not null check(stage between 1 and 27),
  calibration_state text not null check(calibration_state in ('draft','published')),
  canonical_visual_scale numeric not null check(canonical_visual_scale between .02 and 2),
  visual_height_class text not null check(visual_height_class in ('seed','sprout','young_plant','small_tree','medium_tree','large_tree','giant_tree')),
  visual_footprint_class text not null check(visual_footprint_class in ('tiny','narrow','balanced','broad','monumental')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(stage,calibration_state)
);
alter table public.forest_tree_calibrations enable row level security;
revoke all on table public.forest_tree_calibrations from anon,authenticated;
grant select on table public.forest_tree_calibrations to anon,authenticated;
grant insert,update on table public.forest_tree_calibrations to authenticated;
create policy "Published Tree scale is publicly readable" on public.forest_tree_calibrations for select to anon using(calibration_state='published');
create policy "Signed in users read published Tree scale and Super Admin drafts" on public.forest_tree_calibrations for select to authenticated using(calibration_state='published' or ((select auth.uid())=updated_by and private.is_super_admin()));
create policy "Super Admin creates Tree scale calibration" on public.forest_tree_calibrations for insert to authenticated with check((select auth.uid())=updated_by and private.is_super_admin());
create policy "Super Admin updates Tree scale calibration" on public.forest_tree_calibrations for update to authenticated using((select auth.uid())=updated_by and private.is_super_admin()) with check((select auth.uid())=updated_by and private.is_super_admin());
create index if not exists forest_tree_calibrations_updated_by_idx on public.forest_tree_calibrations(updated_by) where updated_by is not null;

insert into public.forest_tree_calibrations(stage,calibration_state,canonical_visual_scale,visual_height_class,visual_footprint_class)
select stage,'published',scale,height_class,footprint from (values
 (1,.08,'seed','tiny'),(2,.16,'sprout','tiny'),(3,.27,'young_plant','tiny'),(4,.42,'small_tree','narrow'),(5,.48,'small_tree','broad'),(6,.52,'small_tree','broad'),(7,.56,'small_tree','broad'),
 (8,.50,'medium_tree','broad'),(9,.54,'medium_tree','broad'),(10,.58,'medium_tree','narrow'),(11,.61,'medium_tree','broad'),(12,.64,'medium_tree','narrow'),(13,.66,'medium_tree','broad'),(14,.60,'medium_tree','broad'),(15,.67,'medium_tree','broad'),
 (16,.64,'large_tree','narrow'),(17,.72,'large_tree','broad'),(18,.78,'large_tree','broad'),(19,.76,'large_tree','broad'),(20,.72,'large_tree','narrow'),(21,.76,'large_tree','narrow'),(22,.79,'large_tree','narrow'),
 (23,.98,'giant_tree','monumental'),(24,.82,'giant_tree','narrow'),(25,.86,'giant_tree','narrow'),(26,.90,'giant_tree','broad'),(27,1.08,'giant_tree','monumental')
) as calibration(stage,scale,height_class,footprint)
on conflict(stage,calibration_state) do nothing;

update public.forest_asset_manifest m set default_scale=c.canonical_visual_scale,updated_at=now()
from public.forest_tree_calibrations c where m.asset_kind='tree' and m.stage=c.stage and c.calibration_state='published';
