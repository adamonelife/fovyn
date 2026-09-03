insert into public.forest_environment_slots(
  environment_key,slot_id,calibration_state,source_x,source_y,depth,
  tree_scale,z_index,label_anchor,label_offset_x,label_offset_y,
  card_direction,enabled,updated_at
)
values(
  'clearing','clearing_slot_05','published',.52,.82,'near',.92,82,
  'centre',0,.015,'above',true,now()
)
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
