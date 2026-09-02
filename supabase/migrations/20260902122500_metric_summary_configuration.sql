alter table public.trackers
  add column if not exists metric_summary_mode text not null default 'latest',
  add column if not exists metric_summary_period text not null default 'total',
  add column if not exists metric_record_cardinality text not null default 'multiple';

alter table public.trackers
  drop constraint if exists trackers_metric_summary_mode_check,
  add constraint trackers_metric_summary_mode_check
    check (metric_summary_mode in ('latest','sum','average','minimum','maximum')),
  drop constraint if exists trackers_metric_summary_period_check,
  add constraint trackers_metric_summary_period_check
    check (metric_summary_period in ('day','week','month','total')),
  drop constraint if exists trackers_metric_record_cardinality_check,
  add constraint trackers_metric_record_cardinality_check
    check (metric_record_cardinality in ('multiple','one_per_day'));
