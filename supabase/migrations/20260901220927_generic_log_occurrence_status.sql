alter table public.tracking_records
  add column if not exists occurrence_status text;

alter table public.tracking_records
  drop constraint if exists tracking_records_occurrence_status_check;
alter table public.tracking_records
  add constraint tracking_records_occurrence_status_check
  check (occurrence_status is null or occurrence_status in ('complete','failed','skipped'));

create index if not exists tracking_records_owner_status_occurred_idx
  on public.tracking_records(owner_id,occurrence_status,occurred_at desc)
  where deleted_at is null and occurrence_status is not null;
