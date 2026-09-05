# Fovyn analytics foundation

Analytics readiness is part of the Definition of Done. Canonical records describe what happened; product telemetry describes meaningful use of Fovyn. Neither is a substitute for the other.

## Environments and exclusions

- `alpha` and `development` are separate analytical environments within the shared Supabase project.
- Existing records are `alpha`. Only the protected Development application may request `development`, and the database accepts that request only for a Super Admin.
- `is_test` is structured provenance. Test Mode, Forest Lab fixtures, seeded QA records and synthetic data never count in operational totals.
- The rolling “Last 7 Days” window means the preceding 168 hours.

## Canonical data dictionary

| Concept | Source of truth | Occurrence time | Notes |
| --- | --- | --- | --- |
| User account | `auth.users` + `profiles` | `profiles.created_at` | Verified means `auth.users.email_confirmed_at` is set. Never expose account details in aggregate views. |
| Goal / Tree | `goals` | `goals.created_at` | One Goal creates one Tree for life. Stage changes never create another Tree. |
| Goal lifecycle | `goal_lifecycle_events` | `occurred_at` | Records planting, dormancy, awakening, completion, archive and stage transitions. |
| Growth award | `goal_growth_awards` | `earned_at` | Idempotent canonical growth evidence. |
| Goal contribution | `goal_source_contributions` | `occurred_at` | Relationship to the canonical source record; never a duplicate History item. |
| Guidance use | `guidance_events` | `occurred_at` | Privacy-safe guidance/suggestion events. |
| Product use | `product_events` | `occurred_at` | Meaningful interactions only; no sensitive values or user-created content. |

Other modules continue to use their canonical dated records. Analytics must query those records rather than copying Nutrition, Training, Money, Cycle or health facts into generic analytics tables.

## Product event taxonomy

Stable names are snake_case. `event_version` changes only when the event schema changes; an existing name must not silently change meaning.

| Event | Meaning and emission point | Allowed properties |
| --- | --- | --- |
| `account_created` | A genuine account is created | interface locale, device class and application version supplied by shared columns only |
| `email_verified` | Supabase confirms the account email | shared columns only |
| `goal_created` | A canonical Goal is created | non-sensitive system keys such as Area or rule type |
| `tree_planted` | The Goal's one canonical Tree is created | non-sensitive Area key; idempotent with Goal identity |
| `goal_completed` | A genuine Goal reaches completed state | non-sensitive system keys only |
| `forest_opened` | User intentionally opens the Forest | environment key only |
| `tree_guide_opened` | User intentionally opens Tree Guide | entry-point key only |
| `training_session_created` | Canonical Training Session creation succeeds | source type only; no workout content |
| `guidance_shown` / `guidance_dismissed` / `help_reopened` | Shared Guidance interaction | feature key and guidance version |
| `suggestion_shown` / `suggestion_selected` / `suggestion_edited` / `suggestion_saved` | Shared Suggestions interaction | stable suggestion and feature keys; never edited user text |

Future feature events must be added here before emission. Refreshes, React renders, hover, scrolling and keystrokes are not events. Callers provide a stable `idempotency_key`; duplicate delivery is harmless.

## Sensitive-data prohibition

Generic telemetry must never contain Money amounts or balances; Cycle, sexual-activity or pregnancy details; health values; Goal names or notes; journal/private-message content; or other user-entered text. Personal analytics may analyse a user's own canonical records within the separately governed personal experience.

## Operational counters

`super_admin_overview(environment)` is the first visibility layer. It returns aggregate counts only, verifies Super Admin access inside the database, excludes Test Mode, and does not expose identities or sensitive records. The two primary counters are genuine Users and lifetime canonical Trees Planted.
