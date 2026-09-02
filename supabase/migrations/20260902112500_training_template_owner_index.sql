drop index if exists public.training_sessions_template_id_idx;
create index if not exists training_sessions_template_owner_idx on public.training_sessions(template_id,owner_id);
