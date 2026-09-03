-- Mobile Forest compositions use a separate coordinate namespace from desktop.
-- Each environment exposes exactly three planting slots per mobile page. Further
-- Trees reuse these slots on a duplicate page of the same environment artwork.
with mobile_slots(environment_key,slot_id,source_x,source_y,depth,tree_scale,z_index,label_anchor,card_direction) as (
  values
    ('nursery@mobile','nursery_slot_01',.365,.585,'far',.58,59,'left','right'),
    ('nursery@mobile','nursery_slot_02',.610,.655,'mid',.72,66,'right','left'),
    ('nursery@mobile','nursery_slot_03',.430,.810,'near',.90,82,'centre','above'),

    ('clearing@mobile','clearing_slot_01',.335,.690,'mid',.78,70,'left','right'),
    ('clearing@mobile','clearing_slot_02',.610,.640,'far',.62,65,'right','left'),
    ('clearing@mobile','clearing_slot_03',.500,.805,'near',.94,82,'centre','above'),

    ('area-health@mobile','health_slot_01',.350,.625,'far',.62,63,'left','right'),
    ('area-health@mobile','health_slot_02',.625,.690,'mid',.76,70,'right','left'),
    ('area-health@mobile','health_slot_03',.455,.820,'near',.92,83,'centre','above'),

    ('area-mind@mobile','mind_slot_01',.360,.620,'far',.60,63,'left','right'),
    ('area-mind@mobile','mind_slot_02',.625,.685,'mid',.74,69,'right','left'),
    ('area-mind@mobile','mind_slot_03',.450,.815,'near',.90,82,'centre','above'),

    ('area-self@mobile','self_slot_01',.350,.610,'far',.60,62,'left','right'),
    ('area-self@mobile','self_slot_02',.630,.680,'mid',.75,69,'right','left'),
    ('area-self@mobile','self_slot_03',.455,.810,'near',.91,82,'centre','above'),

    ('area-people@mobile','people_slot_01',.345,.615,'far',.60,62,'left','right'),
    ('area-people@mobile','people_slot_02',.625,.685,'mid',.75,69,'right','left'),
    ('area-people@mobile','people_slot_03',.450,.815,'near',.91,82,'centre','above'),

    ('area-work@mobile','work_slot_01',.350,.615,'far',.60,62,'left','right'),
    ('area-work@mobile','work_slot_02',.630,.680,'mid',.75,69,'right','left'),
    ('area-work@mobile','work_slot_03',.455,.815,'near',.91,82,'centre','above'),

    ('area-wealth@mobile','wealth_slot_01',.350,.610,'far',.60,62,'left','right'),
    ('area-wealth@mobile','wealth_slot_02',.625,.680,'mid',.75,69,'right','left'),
    ('area-wealth@mobile','wealth_slot_03',.455,.810,'near',.91,82,'centre','above'),

    ('dormant-woods@mobile','dormant_slot_01',.345,.610,'far',.58,62,'left','right'),
    ('dormant-woods@mobile','dormant_slot_02',.630,.680,'mid',.72,69,'right','left'),
    ('dormant-woods@mobile','dormant_slot_03',.455,.810,'near',.88,82,'centre','above'),

    ('heartwood@mobile','heartwood_slot_01',.350,.610,'far',.60,62,'left','right'),
    ('heartwood@mobile','heartwood_slot_02',.630,.680,'mid',.75,69,'right','left'),
    ('heartwood@mobile','heartwood_slot_03',.455,.810,'near',.91,82,'centre','above')
)
insert into public.forest_environment_slots(
  environment_key,slot_id,calibration_state,source_x,source_y,depth,
  tree_scale,z_index,label_anchor,label_offset_x,label_offset_y,
  card_direction,enabled,updated_at
)
select environment_key,slot_id,'published',source_x,source_y,depth,
  tree_scale,z_index,label_anchor,0,.018,card_direction,true,now()
from mobile_slots
on conflict(environment_key,slot_id,calibration_state) do update set
  source_x=excluded.source_x,
  source_y=excluded.source_y,
  depth=excluded.depth,
  tree_scale=excluded.tree_scale,
  z_index=excluded.z_index,
  label_anchor=excluded.label_anchor,
  label_offset_x=excluded.label_offset_x,
  label_offset_y=excluded.label_offset_y,
  card_direction=excluded.card_direction,
  enabled=true,
  updated_at=now();

insert into public.forest_environment_views(
  environment_key,viewport_profile,calibration_state,position_x,position_y,
  zoom,scrollable,updated_at
)
select environment_key,'mobile','published',.5,.58,1.35,true,now()
from unnest(array[
  'nursery','clearing','area-health','area-mind','area-self','area-people',
  'area-work','area-wealth','dormant-woods','heartwood'
]) environment_key
on conflict(environment_key,viewport_profile,calibration_state) do update set
  position_x=excluded.position_x,
  position_y=excluded.position_y,
  zoom=excluded.zoom,
  scrollable=excluded.scrollable,
  updated_at=now();
