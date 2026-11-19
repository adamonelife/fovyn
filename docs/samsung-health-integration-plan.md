# Samsung Health integration plan

_Status: prepared only — not implemented. Nutrition V1.2 remains the current release priority._

## Decision

Use **Health Connect as the first integration layer**. Samsung Health already transfers supported Galaxy Watch data to the paired phone and can synchronise steps, exercise, heart rate and sleep into Health Connect.

Fovyn is currently a web application, while Health Connect is an Android API. The integration therefore needs a small signed Android companion application; browser code must not attempt to access health data directly.

Evaluate the **Samsung Health Data SDK** only as a second adapter when Samsung-only detail is required. It requires Samsung Health 6.30.2+, Android 10+, Java 17+, physical-device testing, and Samsung partner registration for production package/signature access. The deprecated Samsung Health SDK for Android must not be used.

## Initial data scope

| Fovyn metric | Health Connect record | Treatment |
| --- | --- | --- |
| Actual steps | StepsRecord aggregate | Store and display as actual steps only |
| Active calories | ActiveCaloriesBurnedRecord | Daily aggregate; never infer from food calories |
| Exercise | ExerciseSessionRecord | Preserve type, start/end, title and source |
| Cycling | ExerciseSessionRecord (cycling types), distance/energy where present | Keep as activity and derive a separate optional equivalence |
| Heart rate | HeartRateRecord | Daily summary plus workout ranges; retain granular samples only when needed |
| Sleep | SleepSessionRecord and stages | Sessions may cross midnight; attribute using Fovyn's Asia/Makassar day rules |

## Cycling-equivalent steps

Never add cycling estimates to the raw Health Connect step count.

Store three values independently:

- `actual_steps`
- `cycling_equivalent_steps`
- `combined_activity_equivalent` (presentation only: actual + equivalent)

The cycling value is explicitly labelled **estimated**, carries a `formula_version`, and can be recalculated without changing source health records. The first formula should use cycling duration plus available intensity evidence (active calories and/or average heart rate), with conservative configurable bands. If intensity evidence is missing, use duration only and flag the lower confidence. Do not present it as a medically standard conversion.

## Architecture

1. **Android companion**
   - Kotlin + Jetpack Health Connect client.
   - Samsung/Google sign-in is not used as Fovyn identity; authenticate with the existing Supabase account.
   - Request only read permissions needed for steps, active calories, exercise, heart rate and sleep.
   - Explain each permission before opening the Health Connect permission screen.
   - Support foreground sync first; add background/history permissions only when the user enables automatic sync.

2. **Secure sync**
   - Companion reads daily aggregates and changed records, then calls a Supabase Edge Function with the user's access token.
   - Edge Function validates the JWT and writes only to that owner's rows.
   - No Samsung or Supabase service credentials are embedded in the app.
   - Raw health payloads are minimised; Fovyn stores the fields needed for summaries and auditability.

3. **Additive Supabase model**
   - `health_connections`: owner, provider, device/app status, last successful sync, permission state.
   - `health_daily_summaries`: owner, local date, actual steps, active calories, cycling-equivalent steps, formula version.
   - `health_exercise_sessions`: source record ID, type, timestamps, duration, distance, calories, source origin.
   - `health_sleep_sessions`: source record ID, timestamps, duration and stages summary.
   - `health_heart_rate_summaries`: date/session scope, min/max/average/resting values.
   - `health_sync_cursors`: per owner/provider/data type change token and last window.
   - All tables use RLS, `owner_id = auth.uid()`, soft deletion where appropriate, and test-context separation.

4. **Idempotency and two-phone handling**
   - Unique key: owner + provider + Health Connect record ID/data origin.
   - Fall back to a stable source/time/content hash only when a record ID is unavailable.
   - Apply inserts, updates and deletions from Health Connect change logs.
   - Aggregate via Health Connect rather than summing records from both phones.
   - Nominate one phone as the primary automatic sync device. A second phone may run manual sync, but the same external IDs must upsert rather than duplicate.
   - Surface source and last-sync time so Watch 7 daytime and Watch 4 sleep data can be audited without treating them as separate people.

## User experience

Add a compact **Health** connection panel under Settings, not a redesign of Training or Nutrition:

- Connect Health Connect
- Permission/status checklist
- Sync now
- Last successful sync and recoverable error
- Automatic sync toggle
- Data-source diagnostics

Weekly receives read-only cards for actual steps, active calories, exercise, sleep and cycling-equivalent steps. Imported health data must not overwrite manually logged Training sessions. Where an exercise overlaps an existing Fovyn workout, link or mark the overlap instead of creating a duplicate workout.

## Delivery sequence

1. Confirm Samsung Health is syncing the required types to Health Connect on the primary phone.
2. Build and sign a minimal internal Android companion.
3. Add migrations, RLS and the authenticated sync Edge Function.
4. Implement foreground import with a 7-day test window.
5. Verify Watch 7 activity and Watch 4 sleep across midnight and after delayed Samsung sync.
6. Add change-log incremental sync and optional background permission.
7. Add Fovyn Settings/Weekly summaries.
8. Test the second phone, reinstall, permission revocation, timezone travel, duplicate records and offline retry.
9. Only then assess Samsung Health Data SDK partner access for richer Samsung-specific fields.

## Acceptance checks

- Raw steps exactly match Health Connect's daily aggregate.
- Cycling never changes raw steps.
- Repeating sync produces no duplicate rows or Weekly totals.
- Updates/deletions in Health Connect reconcile safely.
- Sleep spanning midnight is attributed consistently.
- Permission denial or revocation leaves existing Fovyn modules working.
- Training history, Nutrition, Reading and Weekly regressions pass.
- No health data is exposed across users or test/real contexts.

## Official references

- Android Health Connect: https://developer.android.com/health-and-fitness/health-connect
- Health Connect workout reads and change logs: https://developer.android.com/health-and-fitness/health-connect/experiences/workouts
- Health Connect data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Samsung Health / Health Connect FAQ: https://developer.samsung.com/health/health-connect-faq.html
- Samsung Health Data SDK: https://developer.samsung.com/health/data/overview.html
- Samsung Health Data SDK developer mode and partner registration: https://developer.samsung.com/health/data/guide/developer-mode.html
