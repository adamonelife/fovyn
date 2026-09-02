insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fovyn-assets',
  'fovyn-assets',
  true,
  26214400,
  array['image/avif','image/webp','image/png','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.forest_asset_manifest (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null,
  asset_version integer not null default 1 check (asset_version > 0),
  variant text not null default 'default' check (variant in ('default','desktop','mobile')),
  asset_kind text not null check (asset_kind in ('tree','environment','icon','brand','reference')),
  stage smallint check (stage between 1 and 27),
  canonical_name text not null,
  storage_path text,
  mime_type text check (mime_type is null or mime_type in ('image/avif','image/webp','image/png','image/svg+xml')),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  anchor_x numeric not null default 0.5 check (anchor_x between 0 and 1),
  anchor_y numeric not null default 1 check (anchor_y between 0 and 1),
  default_scale numeric not null default 1 check (default_scale > 0),
  mobile_scale_modifier numeric not null default 1 check (mobile_scale_modifier > 0),
  desktop_scale_modifier numeric not null default 1 check (desktop_scale_modifier > 0),
  status text not null default 'missing' check (status in ('missing','ready','reference_only','retired')),
  source_file text,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_key, asset_version, variant),
  check ((status = 'ready' and storage_path is not null and width is not null and height is not null and mime_type is not null) or status <> 'ready'),
  check ((asset_kind = 'tree' and stage is not null) or (asset_kind <> 'tree' and stage is null)),
  check (asset_kind = 'reference' or status <> 'reference_only')
);

alter table public.forest_asset_manifest enable row level security;

drop policy if exists "Public can read ready Forest application assets" on public.forest_asset_manifest;
create policy "Public can read ready Forest application assets"
on public.forest_asset_manifest for select
to anon, authenticated
using (status = 'ready' and asset_kind <> 'reference');

grant select on public.forest_asset_manifest to anon, authenticated;
revoke insert, update, delete on public.forest_asset_manifest from anon, authenticated;

create index if not exists forest_asset_manifest_ready_key_idx
on public.forest_asset_manifest (asset_key, asset_version desc, variant)
where status = 'ready';

insert into public.forest_asset_manifest (asset_key, asset_kind, stage, canonical_name)
select 'forest.tree.stage' || lpad(stage::text, 2, '0'), 'tree', stage::smallint, canonical_name
from unnest(array[
  'Seed','Sprout','Young Plant','Common Juniper','Japanese Maple','Jacaranda','Rowan',
  'Flowering Dogwood','Holly','Silver Birch','Golden Ginkgo','Rainbow Eucalyptus',
  'White Willow','Cherry Blossom','Red Maple','Eucalyptus','Royal Poinciana / Flame Tree',
  'English Oak','Copper Beech','Norway Spruce','Golden Larch','Blue Atlas Cedar',
  'Giant Sequoia','Douglas Fir','Japanese Cedar','Giant Mountain Ash','Coast Redwood'
]::text[]) with ordinality as locked(canonical_name, stage)
on conflict (asset_key, asset_version, variant) do nothing;

insert into public.forest_asset_manifest (asset_key, asset_kind, canonical_name)
values
  ('forest.environment.nursery','environment','Nursery'),
  ('forest.environment.clearing','environment','The Clearing'),
  ('forest.environment.area.health','environment','Health'),
  ('forest.environment.area.mind','environment','Mind'),
  ('forest.environment.area.self','environment','Self'),
  ('forest.environment.area.people','environment','People'),
  ('forest.environment.area.work','environment','Work'),
  ('forest.environment.area.wealth','environment','Wealth'),
  ('forest.environment.dormant_woods','environment','Dormant Woods'),
  ('forest.environment.heartwood','environment','Heartwood')
on conflict (asset_key, asset_version, variant) do nothing;

insert into public.forest_asset_manifest (asset_key, asset_kind, canonical_name, status, source_file)
values
  ('forest.reference.area.health','reference','Health approved direction board','reference_only','Codex Image 2 Sept 2026, 11_35_45.png'),
  ('forest.reference.area.mind','reference','Mind approved direction board','reference_only','Codex Image 2 Sept 2026, 11_15_19.png'),
  ('forest.reference.area.self','reference','Self approved direction board','reference_only','Codex Image 2 Sept 2026, 11_27_08.png'),
  ('forest.reference.area.people','reference','People approved direction board','reference_only','Codex Image 2 Sept 2026, 11_30_52.png'),
  ('forest.reference.area.work','reference','Work approved direction board','reference_only','Codex Image 2 Sept 2026, 11_37_10.png'),
  ('forest.reference.area.wealth','reference','Wealth approved direction board','reference_only','Codex Image 2 Sept 2026, 11_32_18.png'),
  ('forest.reference.tree_ladder','reference','Approved 27-stage Tree ladder board','reference_only','Codex Image 30 Aug 2026, 19_00_28.png')
on conflict (asset_key, asset_version, variant) do nothing;

comment on table public.forest_asset_manifest is
'Authoritative versioned mapping from semantic Forest identities to production Storage assets. Reference-only rows are never exposed to the application.';
