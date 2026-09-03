-- Mirror the durable role into protected Auth app_metadata for reliable client
-- capability discovery. RLS authority remains the server-side user_roles table.
update auth.users
set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('fovyn_role','super_admin')
where id in (select user_id from public.user_roles where role='super_admin');
