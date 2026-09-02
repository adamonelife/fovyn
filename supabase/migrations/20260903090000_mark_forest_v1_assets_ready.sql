update public.forest_asset_manifest
set status = 'ready',
    updated_at = now()
where asset_version = 1
  and is_active
  and storage_path like 'forest/v1/%'
  and asset_kind in ('tree', 'environment', 'icon');

