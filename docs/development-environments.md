# Alpha and Development environments

Status: authoritative shared-backend policy until Fovyn adopts Supabase Pro branching or a dedicated Development project.

## Current environment map

| Concern | Alpha | Development | Isolation |
| --- | --- | --- | --- |
| Git | `main` | `develop` | Physical |
| Deployment | `https://fovyn-plum.vercel.app/` | `https://forbair-git-develop-adamonelife-9151s-projects.vercel.app/` | Physical |
| Supabase | `ukvrfejyyhgnzljquxvt` | `ukvrfejyyhgnzljquxvt` | Shared temporarily |
| Database | Shared | Shared | Logical provenance and ownership only |
| Auth | Shared | Shared | Authorised Development/test accounts only |
| Storage bucket | `fovyn-assets` | `fovyn-assets` | Shared bucket; immutable published and Development-prefixed paths |
| Test data | Genuine Alpha data | Super Admin Test Mode/synthetic fixtures | `is_test` plus restrictive RLS |
| Analytics | `app_environment = alpha`, excluding `is_test` | `app_environment = development`, excluding `is_test` | Logical |

Never describe the database, Auth or Storage service as physically isolated while this policy is active.

## Mandatory configuration

Every build must explicitly set the following. The application fails instead of selecting a fallback when any required value is absent.

| Variable | Alpha | Development |
| --- | --- | --- |
| `VITE_FOVYN_ENVIRONMENT` | `alpha` | `development` |
| `VITE_SUPABASE_URL` | Shared project URL | Shared project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Shared publishable key | Shared publishable key |
| `VITE_APP_VERSION` | Release identifier | Development identifier |
| `FOVYN_ENVIRONMENT` | `alpha` | `development` |
| `SUPABASE_URL` | Shared project URL | Shared project URL |
| `SUPABASE_SECRET_KEY` | Server-only shared credential | Server-only shared credential |

Set real values in Vercel environment configuration or ignored `.env.local` files. Never commit secret/service-role keys. Client code may receive only the publishable key.

Preview variables for `develop` must be branch-scoped. Production variables belong only to Alpha. The Development UI displays a persistent `DEVELOPMENT · DEV DATA` indicator; Alpha does not.

## Shared-backend data safety

- Development testing uses Adam's authorised account and Super Admin Test Mode.
- The `x-fovyn-data-context: test` request header is accepted as Test Mode only after the database verifies the caller is a Super Admin.
- Covered records receive immutable `is_test` provenance from database triggers. Restrictive RLS prevents real and Test Mode records appearing in the same session.
- Never identify fixtures by names or copy private Alpha user records.
- New domains must join Test Mode provenance, RLS, clearing and analytics exclusions in the same backward-compatible migration that introduces them.
- `x-fovyn-environment` is useful analytical provenance, not an authorization boundary. Security-sensitive server behaviour must use trusted server configuration and authenticated database roles.

## Backward-compatible migration policy

Before applying every migration, answer: **Will this break the current `main`/Alpha frontend?** If yes, do not apply it.

Use expand → migrate → release → contract:

1. **Expand:** add nullable columns, tables, indexes, compatible RPCs or optional relationships. Keep existing Alpha behaviour intact.
2. **Migrate:** let Development use the new structure and perform compatible backfills.
3. **Release:** test Development, smoke-test Alpha, obtain explicit approval and release the compatible frontend to `main`.
4. **Contract:** only in a later explicitly approved release, remove structures no longer used by Alpha.

Do not casually drop or rename columns/tables, remove enum values, change required semantics, break RPC signatures, incompatibly replace RLS, or remove Alpha Storage paths. Destructive changes require a staged release plan.

New migrations must be created on `develop`, committed, ordered and reproducible. Apply them to the shared backend only after backward-compatibility review. Immediately smoke-test the current Alpha application after any shared migration, including relevant Auth, Home, Log, Goals, Forest, History, Training, Nutrition, Money and Canopy journeys.

The repository currently starts its checked-in migration sequence on 1 September 2026 and contains 49 files, while the shared project reports 94 historical migrations. Do not rewrite remote history. Capture and reconcile the missing foundation as a separate read-only schema-history task; every new migration from 5 September 2026 onward must remain committed and canonical.

## Storage and Forest assets

- Published immutable assets retain existing paths such as `forest/v1/...` and may be read by both applications.
- Development experiments use `development/forest/vN/...` and new manifest rows/version identities.
- Alpha application code rejects `development/` Storage paths even if a Development manifest row is newer.
- Development prefers eligible Development paths and falls back to immutable published assets when no experiment exists.
- Never overwrite an existing published object. Approval promotes an immutable Development asset by copying it to a new published version/path and publishing the corresponding manifest identity.
- User uploads, when implemented, require their own private bucket and policies.

## Auth, callbacks and communications

Auth is shared. Signup verification uses `${location.origin}/auth/callback`, so Supabase's allowed redirect list must contain both canonical deployment origins without changing the Alpha Site URL away from Alpha.

Development product communications—Canopy invitations, reminders and notifications—are disabled unless the action is in Test Mode and the recipient is explicitly classified as a test recipient. This policy does not replace Supabase's own account-verification email needed by an authorised Development user. New outbound services must call the shared communication safety guard and enforce the equivalent rule server-side before sending.

## Release and hotfix workflow

Normal work:

`develop` → backward-compatible shared migration if required → Development verification → Alpha smoke test → release candidate → explicit approval → merge to `main` → Alpha verification.

Development never reaches Alpha automatically.

Alpha hotfix:

fix and verify from `main` → deploy Alpha → merge or cherry-pick the same fix into `develop`.

## Future physical isolation

When budget and scale justify it, assign Development its own Supabase project or persistent branch and replace only environment configuration. Code must not assume the two applications always share a backend.
