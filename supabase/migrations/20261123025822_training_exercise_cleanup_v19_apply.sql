-- Production-only reconciliation of the 92 backed-up personal exercise records.
-- Applied by stable exercise name after a dry run; no IDs or relationships were changed.
-- Result: 47 names standardised, 91 family assignments, 49 recovery classifications,
-- and five deliberately review-required records. Original names remain in aliases.
-- The complete pre-change value for every affected row is retained in
-- training_exercise_cleanup_v19_backup for audit and reversal.
alter table public.training_exercises add column if not exists exercise_tags text[] not null default '{}';