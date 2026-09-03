-- A published replacement receives both a new manifest version and a new
-- physical Storage path. Components continue to request the stable asset_key.
with replacements(asset_key, storage_path, checksum) as (
  values
    ('forest.environment.area.health', 'forest/v1/environments/area-health-v2.png', 'e85e79ff81446ecf39ec54990243afa78c629f8cb890b6d972a3513040d88b44'),
    ('forest.environment.area.mind', 'forest/v1/environments/area-mind-v2.png', 'f6deed174b6801dbf3006486377a52e3265a91be6e604858c694fe12e5767921'),
    ('forest.environment.area.self', 'forest/v1/environments/area-self-v2.png', '3f82dc9de6062a2d3934b5f31e56bcca3351377f529a6a9b97983aba776107df'),
    ('forest.environment.area.people', 'forest/v1/environments/area-people-v2.png', '48a2217df1a208e705096404397f186457090506d5f6b70deddcd425f3aac3fe'),
    ('forest.environment.area.work', 'forest/v1/environments/area-work-v2.png', 'ae50131216eab48f89a7fd99f52acee4838365a389f6a283bea74929ff3fcc92'),
    ('forest.environment.area.wealth', 'forest/v1/environments/area-wealth-v2.png', '8e615b3522835f9abafcda5d97d30f3cf0bdcb649bb78304d84f4729fca576d1')
)
insert into public.forest_asset_manifest (
  asset_key, asset_version, variant, asset_kind, stage, canonical_name,
  storage_path, mime_type, width, height, anchor_x, anchor_y,
  default_scale, mobile_scale_modifier, desktop_scale_modifier, status,
  source_file, checksum, environment_key, ground_anchor_y, z_bias,
  depth_preference, is_active, updated_at
)
select
  current.asset_key, 2, current.variant, current.asset_kind, current.stage,
  current.canonical_name, replacements.storage_path, current.mime_type,
  current.width, current.height, current.anchor_x, current.anchor_y,
  current.default_scale, current.mobile_scale_modifier,
  current.desktop_scale_modifier, 'ready', split_part(replacements.storage_path, '/', 4),
  replacements.checksum, current.environment_key, current.ground_anchor_y,
  current.z_bias, current.depth_preference, true, now()
from replacements
join public.forest_asset_manifest current
  on current.asset_key = replacements.asset_key
 and current.asset_version = 1
 and current.variant = 'default'
on conflict (asset_key, asset_version, variant) do update
set storage_path = excluded.storage_path,
    checksum = excluded.checksum,
    status = 'ready',
    is_active = true,
    updated_at = now();

update public.forest_asset_manifest
set status = 'retired',
    is_active = false,
    updated_at = now()
where asset_version = 1
  and variant = 'default'
  and asset_key in (
    'forest.environment.area.health',
    'forest.environment.area.mind',
    'forest.environment.area.self',
    'forest.environment.area.people',
    'forest.environment.area.work',
    'forest.environment.area.wealth'
  );
