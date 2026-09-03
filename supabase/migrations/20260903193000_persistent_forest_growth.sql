alter table public.goals
  add column if not exists forest_stage smallint not null default 1,
  add column if not exists forest_stage_updated_at timestamptz;

alter table public.goals
  drop constraint if exists goals_forest_stage_check;

alter table public.goals
  add constraint goals_forest_stage_check
  check (forest_stage between 1 and 27);

comment on column public.goals.forest_stage is
  'Highest canonical Tree stage earned by this Goal. This high-water mark never decreases.';

comment on column public.goals.forest_stage_updated_at is
  'When this Goal Tree most recently advanced to a higher canonical stage.';
