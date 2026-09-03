-- Complete the production desktop placement baseline. These coordinates are
-- normalized to each approved environment master and remain editable through
-- Forest Lab without changing renderer code.
with slots(environment_key,slot_id,source_x,source_y,depth,tree_scale,z_index,label_anchor,card_direction) as (
  values
    ('nursery','nursery_slot_01',.329,.557,'far',.52,56,'left','right'),
    ('nursery','nursery_slot_02',.643,.555,'far',.52,56,'right','left'),
    ('nursery','nursery_slot_03',.497,.631,'mid',.66,63,'centre','right'),
    ('nursery','nursery_slot_04',.223,.674,'mid',.68,67,'left','right'),
    ('nursery','nursery_slot_05',.760,.676,'mid',.68,68,'right','left'),
    ('nursery','nursery_slot_06',.329,.819,'near',.84,82,'left','above'),
    ('nursery','nursery_slot_07',.609,.821,'near',.84,82,'right','above'),

    ('area-self','self_slot_01',.250,.555,'far',.55,56,'left','right'),
    ('area-self','self_slot_02',.500,.525,'far',.50,53,'centre','right'),
    ('area-self','self_slot_03',.755,.560,'far',.55,56,'right','left'),
    ('area-self','self_slot_04',.360,.710,'mid',.78,71,'left','right'),
    ('area-self','self_slot_05',.650,.720,'near',.86,72,'right','left'),

    ('area-people','people_slot_01',.220,.570,'far',.54,57,'left','right'),
    ('area-people','people_slot_02',.500,.540,'far',.50,54,'centre','right'),
    ('area-people','people_slot_03',.780,.575,'far',.54,58,'right','left'),
    ('area-people','people_slot_04',.350,.705,'mid',.76,71,'left','right'),
    ('area-people','people_slot_05',.660,.710,'near',.84,72,'right','left'),

    ('area-work','work_slot_01',.235,.565,'far',.54,57,'left','right'),
    ('area-work','work_slot_02',.500,.535,'far',.50,54,'centre','right'),
    ('area-work','work_slot_03',.765,.565,'far',.54,57,'right','left'),
    ('area-work','work_slot_04',.355,.700,'mid',.76,70,'left','right'),
    ('area-work','work_slot_05',.650,.710,'near',.84,72,'right','left'),

    ('area-wealth','wealth_slot_01',.230,.555,'far',.54,56,'left','right'),
    ('area-wealth','wealth_slot_02',.490,.525,'far',.50,53,'centre','right'),
    ('area-wealth','wealth_slot_03',.750,.560,'far',.54,56,'right','left'),
    ('area-wealth','wealth_slot_04',.360,.700,'mid',.76,70,'left','right'),
    ('area-wealth','wealth_slot_05',.650,.710,'near',.84,72,'right','left')
)
insert into public.forest_environment_slots(
  environment_key,slot_id,calibration_state,source_x,source_y,depth,
  tree_scale,z_index,label_anchor,label_offset_x,label_offset_y,
  card_direction,enabled,updated_at
)
select environment_key,slot_id,'published',source_x,source_y,depth,
  tree_scale,z_index,label_anchor,0,.015,card_direction,true,now()
from slots
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
select environment_key,'desktop','published',.5,.5,1,false,now()
from unnest(array['area-self','area-people','area-work','area-wealth']) environment_key
on conflict(environment_key,viewport_profile,calibration_state) do update set
  position_x=excluded.position_x,
  position_y=excluded.position_y,
  zoom=excluded.zoom,
  scrollable=excluded.scrollable,
  updated_at=now();

comment on table public.forest_environment_slots is
  'Normalized Forest placement slots. Production uses published rows; Forest Lab manages draft and published calibration for desktop and @mobile environment profiles.';
