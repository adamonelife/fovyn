alter table public.tracker_schedules
  add column if not exists daypart text,
  add column if not exists specific_time time without time zone;

alter table public.tracker_schedules
  drop constraint if exists tracker_schedules_daypart_check;

alter table public.tracker_schedules
  add constraint tracker_schedules_daypart_check
  check (daypart is null or daypart in ('morning', 'day', 'evening'));

comment on column public.tracker_schedules.daypart is
  'Optional presentation grouping for an expected item on Home.';

comment on column public.tracker_schedules.specific_time is
  'Optional local wall-clock time for an expected item; interpreted in the owner profile timezone.';
