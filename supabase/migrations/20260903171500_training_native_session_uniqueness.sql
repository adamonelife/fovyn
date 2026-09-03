alter table public.training_sessions
  drop constraint if exists training_sessions_owner_id_legacy_session_id_performed_on_w_key;

create unique index training_sessions_legacy_import_identity_key
  on public.training_sessions(owner_id,legacy_session_id,performed_on,workout_type,variant)
  where legacy_session_id is not null;
