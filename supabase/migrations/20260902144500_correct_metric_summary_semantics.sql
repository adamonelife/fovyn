update public.trackers
set metric_summary_mode = case
      when measurement_type in ('count','duration','distance','money','energy','mass','volume') then 'sum'
      else 'latest'
    end,
    metric_summary_period = case
      when measurement_type in ('count','duration','distance','money','energy','mass','volume') then 'week'
      else 'total'
    end,
    updated_at = now()
where module = 'metrics';

comment on column public.trackers.metric_summary_mode is
'Explicit Metric card derivation. Additive measurements default to sum; point-in-time measurements default to latest.';
