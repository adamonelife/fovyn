# Training migration

The existing Training Tracker remains the product baseline. The Google Sheet remains untouched as the rollback/reference source until verification passes.

## Source tabs

- `Exercise Library` → `training_exercises`
- `Rules` → `training_rules`
- `Workout Templates` → `training_templates` + `training_template_slots`
- `Workout Log` → `training_sessions` + `training_session_exercises` + `training_sets`
- `Sessions` → session metadata merged into `training_sessions`
- `Cardio Log` → `cardio_entries`

## Required transformations

- Convert Google serial dates (for example `46223`) to ISO dates.
- Preserve Session `0` as baseline history instead of treating it as a normal completed workout.
- Convert `BW` load labels to `load_kg = 0` while retaining `load_label = 'BW'`.
- Convert each populated Set 1–4 pair into an individual `training_sets` row.
- Preserve every original source row in `source_payload` for reconciliation.
- Do not infer values from the malformed legacy `Sessions` rows; keep their raw payload and only map fields whose meaning is confirmed by the header/current app contract.
- Deduplicate the repeated `Leg A / Bike` template row using the slot uniqueness key.

## Cutover gates

1. All 59 exercise rows imported.
2. All 58 active rule rows imported.
3. Template slot counts match after the one known duplicate is removed.
4. Every populated workout-log set has one set row.
5. Session 0 baseline rows remain queryable by exercise.
6. Cardio totals match the Sheet.
7. The app reads Supabase successfully before writes are redirected.
8. A complete workout and cardio entry round-trip successfully.
