create table public.user_guidance_state (
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9_]+$'),
  guidance_version integer not null check (guidance_version > 0),
  first_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  dismissed_at timestamptz,
  is_test boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, feature_key, guidance_version, is_test)
);

alter table public.user_guidance_state enable row level security;
create trigger set_test_provenance before insert or update of is_test on public.user_guidance_state
for each row execute function private.apply_test_provenance();
create policy user_guidance_state_own on public.user_guidance_state for all to authenticated
using ((select auth.uid()) = owner_id and is_test = (private.active_data_context() = 'test'))
with check ((select auth.uid()) = owner_id and is_test = (private.active_data_context() = 'test'));
grant select, insert, update, delete on public.user_guidance_state to authenticated;
revoke all on public.user_guidance_state from anon;

create table public.guidance_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9_]+$'),
  guidance_version integer not null check (guidance_version > 0),
  event_name text not null check (event_name in (
    'guidance_shown','guidance_dismissed','guidance_completed','help_reopened',
    'suggestion_shown','suggestion_selected','suggestion_edited','suggestion_saved'
  )),
  suggestion_key text,
  is_test boolean not null default false,
  occurred_at timestamptz not null default now()
);

alter table public.guidance_events enable row level security;
create index guidance_events_owner_context_time_idx on public.guidance_events(owner_id, is_test, occurred_at desc);
create trigger set_test_provenance before insert or update of is_test on public.guidance_events
for each row execute function private.apply_test_provenance();
create policy guidance_events_insert_own on public.guidance_events for insert to authenticated
with check ((select auth.uid()) = owner_id and is_test = (private.active_data_context() = 'test'));
create policy guidance_events_read_own on public.guidance_events for select to authenticated
using ((select auth.uid()) = owner_id and is_test = (private.active_data_context() = 'test'));
grant select, insert on public.guidance_events to authenticated;
revoke all on public.guidance_events from anon;

comment on table public.user_guidance_state is 'Versioned, contextual first-use guidance state owned by one user.';
comment on table public.guidance_events is 'Privacy-safe product guidance events; never stores user-created content.';
