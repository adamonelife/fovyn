alter table public.forest_asset_manifest
  add column if not exists environment_key text,
  add column if not exists ground_anchor_y numeric not null default 1 check (ground_anchor_y between 0 and 1),
  add column if not exists z_bias numeric not null default 0,
  add column if not exists depth_preference text not null default 'mid' check (depth_preference in ('far','mid','near')),
  add column if not exists is_active boolean not null default true;

update public.forest_asset_manifest
set ground_anchor_y = anchor_y
where asset_kind = 'tree';

insert into public.forest_asset_manifest (asset_key, asset_kind, canonical_name, storage_path, mime_type, width, height, status, source_file)
select
  'forest.icon.' || replace(icon_name, '-', '_'),
  'icon',
  initcap(replace(icon_name, '-', ' ')),
  'forest/v1/icons/' || icon_name || '.svg',
  'image/svg+xml',
  64,
  64,
  'missing',
  icon_name || '.svg'
from unnest(array[
  'home','goals','nursery','history','account','canopy','clearing','climate','trail','roots',
  'growth-rings','dormant','dormant-woods','heartwood','landmarks','water','feed','prune',
  'tend','root-for','bloom','plant-together','share-with-vine','health','mind','self','people','work','wealth'
]::text[]) as icons(icon_name)
on conflict (asset_key, asset_version, variant) do update
set storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    width = excluded.width,
    height = excluded.height,
    source_file = excluded.source_file,
    updated_at = now();

update public.forest_asset_manifest
set storage_path = 'forest/v1/environments/' || case asset_key
      when 'forest.environment.nursery' then 'nursery.png'
      when 'forest.environment.clearing' then 'clearing.png'
      when 'forest.environment.area.health' then 'area-health.png'
      when 'forest.environment.area.mind' then 'area-mind.png'
      when 'forest.environment.area.self' then 'area-self.png'
      when 'forest.environment.area.people' then 'area-people.png'
      when 'forest.environment.area.work' then 'area-work.png'
      when 'forest.environment.area.wealth' then 'area-wealth.png'
      when 'forest.environment.dormant_woods' then 'dormant-woods.png'
      when 'forest.environment.heartwood' then 'heartwood.png'
    end,
    mime_type = 'image/png',
    width = 1536,
    height = 1024,
    environment_key = replace(replace(asset_key, 'forest.environment.', ''), 'area.', ''),
    source_file = case asset_key
      when 'forest.environment.nursery' then 'nursery.png'
      when 'forest.environment.clearing' then 'clearing.png'
      when 'forest.environment.area.health' then 'area-health.png'
      when 'forest.environment.area.mind' then 'area-mind.png'
      when 'forest.environment.area.self' then 'area-self.png'
      when 'forest.environment.area.people' then 'area-people.png'
      when 'forest.environment.area.work' then 'area-work.png'
      when 'forest.environment.area.wealth' then 'area-wealth.png'
      when 'forest.environment.dormant_woods' then 'dormant-woods.png'
      when 'forest.environment.heartwood' then 'heartwood.png'
    end,
    updated_at = now()
where asset_kind = 'environment';

with metadata(stage, width, height, ground_anchor_y, default_scale, mobile_scale_modifier, desktop_scale_modifier, z_bias, depth_preference) as (
  values
    (1,1536,1024,.72,.42,1.08,.95,2,'near'), (2,1024,1536,.74,.46,1.08,.95,2,'near'),
    (3,1024,1536,.76,.50,1.08,.95,2,'near'), (4,1024,1536,.76,.55,.90,1,0,'mid'),
    (5,1536,1024,.72,.58,.90,1,0,'mid'), (6,1165,1350,.94,.66,.90,1,0,'mid'),
    (7,1024,1536,.94,.68,.90,1,0,'mid'), (8,1182,1331,.94,.67,.90,1,0,'mid'),
    (9,1024,1536,.69,.70,.90,1,0,'mid'), (10,1024,1536,.69,.72,.90,1,0,'mid'),
    (11,1024,1536,.70,.74,.90,1,0,'mid'), (12,1024,1536,.69,.76,.90,1,0,'mid'),
    (13,1024,1536,.69,.78,.90,1,0,'mid'), (14,1024,1536,.69,.78,.90,1,0,'mid'),
    (15,1024,1536,.68,.80,.90,1,0,'mid'), (16,1224,1285,.94,.80,.90,1,0,'far'),
    (17,1536,1024,.94,.82,.90,1,0,'far'), (18,1312,1199,.94,.84,.90,1,0,'far'),
    (19,1305,1206,.94,.85,.90,1,0,'far'), (20,1024,1536,.94,.88,.90,1,0,'far'),
    (21,1024,1536,.94,.89,.90,1,0,'far'), (22,1145,1374,.94,.90,.90,1,0,'far'),
    (23,1024,1536,.95,.92,.90,1,0,'far'), (24,1024,1536,.95,.92,.90,1,0,'far'),
    (25,1024,1536,.95,.93,.90,1,0,'far'), (26,1024,1536,.94,.94,.90,1,0,'far'),
    (27,1024,1536,.95,.96,.90,1,0,'far')
)
update public.forest_asset_manifest manifest
set storage_path = 'forest/v1/trees/tree-' || lpad(manifest.stage::text, 2, '0') || '.png',
    mime_type = 'image/png',
    width = metadata.width,
    height = metadata.height,
    ground_anchor_y = metadata.ground_anchor_y,
    anchor_y = metadata.ground_anchor_y,
    default_scale = metadata.default_scale,
    mobile_scale_modifier = metadata.mobile_scale_modifier,
    desktop_scale_modifier = metadata.desktop_scale_modifier,
    z_bias = metadata.z_bias,
    depth_preference = metadata.depth_preference,
    source_file = 'tree-' || lpad(manifest.stage::text, 2, '0') || '.png',
    updated_at = now()
from metadata
where manifest.asset_kind = 'tree' and manifest.stage = metadata.stage;

comment on column public.forest_asset_manifest.ground_anchor_y is
'Normalized image-space ground intersection. Content below this line is buried by the renderer.';

