-- Read-only parity audit for the Training Calculator migration.
-- Run after importing the definitive Google Sheet. Native Fovyn sessions are
-- intentionally excluded by requiring a legacy_session_id.

with migrated_sessions as (
  select id, source_payload
  from public.training_sessions
  where legacy_session_id is not null
),
migrated_exercises as (
  select se.id
  from public.training_session_exercises se
  join migrated_sessions ms on ms.id = se.session_id
)
select
  (select count(*) from public.training_exercises) as exercises,
  (select count(*) from public.training_rules) as rules,
  (select count(*) from public.training_template_slots) as unique_template_rows,
  (select count(*) from migrated_sessions) as migrated_sessions,
  (select count(*) from public.training_sessions where legacy_session_id = 0) as baseline_session_groups,
  (select coalesce(sum(jsonb_array_length(source_payload -> 'workout_log_rows')), 0) from migrated_sessions) as preserved_workout_rows,
  (select count(*) from public.training_sets s join migrated_exercises me on me.id = s.session_exercise_id where s.target_value is not null) as populated_sets,
  (select count(*) from public.cardio_entries where legacy_cardio_id is not null) as cardio_rows,
  (select count(*) from public.training_sessions where legacy_session_id is null) as native_fovyn_sessions;

-- These values are the duplicate-prevention keys used by a repeat import.
select owner_id, exercise_key, count(*)
from public.training_exercises
group by owner_id, exercise_key
having count(*) > 1;

select owner_id, rule_key, count(*)
from public.training_rules
group by owner_id, rule_key
having count(*) > 1;

select owner_id, legacy_session_id, performed_on, workout_type, variant, count(*)
from public.training_sessions
where legacy_session_id is not null
group by owner_id, legacy_session_id, performed_on, workout_type, variant
having count(*) > 1;

select owner_id, legacy_cardio_id, performed_on, activity, count(*)
from public.cardio_entries
where legacy_cardio_id is not null
group by owner_id, legacy_cardio_id, performed_on, activity
having count(*) > 1;
