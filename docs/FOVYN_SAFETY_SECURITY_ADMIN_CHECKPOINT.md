# Fovyn Safety, Security and Admin Checkpoint

Status: locked for later implementation. Preserve compatibility during Functional V1; do not build the full platform yet.

## Required sequence

Functional V1 → Functional QA → Forest V1 → Safety / Security / Admin → Friends Alpha.

No external Friends Alpha accounts may be issued until the final Safety, Security and Admin gate passes.

## Architecture invariants to preserve now

- Personal data is scoped to the immutable internal user ID. Database-level Supabase RLS must enforce ownership; UI or API filtering is not sufficient.
- Fovyn production assets and private user media remain separate. `fovyn-assets` is for Fovyn-owned assets; `user-uploads` is private, access-controlled and not publicly enumerable.
- Authentication must allow explicit privileged internal roles without treating every authenticated account as an ordinary user. At minimum, the future model must support Super Admin and remain extensible to staff, moderation, trust and safety, support, analytics and technical roles.
- Passwords and authentication secrets are sacrosanct. No role, including Super Admin, can retrieve passwords, reset/session tokens, API secrets or equivalent credentials. They must never appear in plaintext, reversible storage, APIs, application logs, analytics, audit payloads or admin tools.
- Future administrative recovery is limited to actions such as disabling an account, revoking sessions and initiating secure password recovery. The final active Super Admin cannot be removed without a replacement, and privileged access must be explicit and auditable.
- Password validation and the future Generate Password feature must share one authoritative ruleset. Generated plaintext is shown only to the user during generation and is not retained for retrieval.
- Privileged actions require an audit model covering actor, role, action, target, timestamp, reason/context and result without sensitive authentication secrets.
- Keep architecture compatible with later abuse prevention, rate limiting, upload validation, content moderation, reporting, blocking, sanctions, appeals, child protection, Canopy/social safety, suspicious-activity handling and emergency controls.

## Population insights boundary

Fovyn may eventually create commercial intelligence only from appropriately de-identified and aggregated population-level trends. Fovyn does not sell individual behavioural histories, identifiable personal records, or access that enables reconstruction of an individual's behaviour.

Future population analytics must use a controlled aggregate/de-identified layer, not arbitrary queries over raw user records. Preserve canonical internal user IDs, structured occurrence and recording timestamps, system taxonomies separate from user labels, structured units, Goal Areas/categories, relevant historical context, provenance and canonical facts.

The later privacy design must support minimum cohort sizes, suppression of tiny cohorts and rare combinations, broad age bands and geography, resistance to re-identification through excessive filtering, role-controlled access and auditability. Exact thresholds, consent/legal design and any stronger privacy techniques are deliberately deferred.

## Decisions deferred to the dedicated phase

- Minimum age and child-protection model.
- Exact privileged-role permissions and operational interfaces.
- Cohort thresholds and population-insight privacy rules.
- Complete moderation, support, security-hardening and admin workflows.

Do not independently lock these decisions during Functional V1.

## Final pre-alpha gate

Before Friends Alpha, define, build and test Fovyn Admin, Trust & Safety, security hardening, privacy, age/child safety, abuse prevention and population-insight safeguards. Functional V1, Forest V1 and this gate must all pass before release.
