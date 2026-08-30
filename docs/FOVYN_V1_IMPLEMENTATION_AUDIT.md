# Fovyn V1 implementation audit

Audit date: 30 August 2026  
Scope: current production branch (`origin/main`) and live Supabase project  
Directive: whole functional V1 except the full production Forest

## Executive conclusion

No directive section is currently complete under the new end-to-end Definition of Done. The production app is a polished prototype with a real Training vertical slice, an unwired Habits database foundation, responsive styling, PWA packaging, and Forest foundations. Most other visible features use hard-coded samples, component state, or `localStorage` and therefore do not persist across devices or drive dependent systems.

The implementation should proceed as complete vertical journeys, not as 32 independent screens. The database, repository, and business-rule layer must be established before completing the visible modules.

## Evidence snapshot

- Current UI: five main navigation destinations exist and are responsive.
- Real Supabase integration: Training only.
- Browser-only state: current Habits, generic records, Account toggles, and Modes.
- Hard-coded/sample state: Home, Goals, Goal Sets, Calendar, History, Reviews, Insights, Forest content, and profile identity.
- Live Supabase: 12 public tables, all with RLS enabled and owner-scoped CRUD policies.
- Live training data: 58 exercises, 58 rules, 6 templates, 63 template slots, 8 sessions, 100 session exercises, 222 sets, and 1 cardio entry.
- Habits database: `habits`, `habit_schedules`, and `habit_entries` exist with RLS but contain no rows and have no current UI repository wiring.
- Missing database domains: categories/subcategories, structured measurement catalogue, general trackers, unified records/contributions, Goals/rule history, Goal Sets, Modes, reviews, round-ups, notes, and most module-specific data.
- Automated suite: 19 passing unit tests across six test files; no authenticated integration, RLS isolation, browser journey, refresh, or cross-device tests.
- Security advisor: RLS structure is healthy; leaked-password protection is currently disabled.
- Release structure: production code is on the Vite line; database migrations exist remotely but are not present as migration files in the current production checkout.

## Status by directive section

| # | Section | Status | Current reality | Completion work |
|---|---|---|---|---|
| 1 | Measurements / units | **PARTIAL** | Training and Habit schemas use numeric columns, but generic records and Goals use strings such as `"80kg"`. Profile has timezone only. | Controlled measurement types/units, custom-unit escape hatch, conversion rules, user defaults, structured record and Goal values, validation and conversion tests. |
| 2 | Categories / subcategories | **MISSING** | Six Areas exist only as TypeScript/sample values. | Fixed Area catalogue; owned subcategories with edit/archive; snapshot/history integrity; links from trackers, Goals, History. |
| 3 | Goals | **PLACEHOLDER / INERT** | Sample Goals render. New Goal and rule editing buttons do nothing; progress is stored sample percentage. | Full schema, CRUD/lifecycle, effective-dated rules, targets, periods, tracker links, derived progress, Goal history, completion/resumption/pruning. |
| 4 | Track management | **PARTIAL** | Module chooser and generic local quick-log exist. Manage is inert. | Tracker definitions and settings in Supabase; create/edit/archive/pause/resume; schedules; history-safe deletion; typed Add flows. |
| 5 | Habits | **PARTIAL** | Local habit creation/toggle works on one browser. Supabase schema and RLS exist but are unwired. | Connect UI to database; positive/negative, negotiability, Done/Missed/N/A/missing, notes, undo, temporary/pause/archive and history. |
| 6 | Metrics | **PLACEHOLDER / INERT** | Generic string quick-log stored in `localStorage`. | Typed Metric definitions/readings, multiple daily readings, corrections/deletion, trends, History and Goal contribution. |
| 7 | Routines | **PLACEHOLDER / INERT** | Listed in chooser but receives only generic string records. | Routine definitions, variants, steps, schedules, adherence, lifecycle, History and Goal links. |
| 8 | Training | **PARTIAL** | Real template/manual workout, sets, RPE, notes, progression, Supabase persistence, RLS and offline queue exist. | Atomic save, edit/correction, session/exercise history, persisted PB view, cardio flow, Normal/Rehab/Light, Goal linkage, migration parity and multi-device/E2E tests. |
| 9 | Physical activity | **PARTIAL** | `cardio_entries` exists with one imported row; no real activity UI. | Configurable activity types, full typed logging/edit/history/social flag/Goal contribution. |
| 10 | Nutrition | **PLACEHOLDER / INERT** | Generic string quick-log and hard-coded Home summary only. | Foods/meals/saved meals/manual macros/plans, targets, classifications, fast Today entry, History and Goals. |
| 11 | Sleep | **PLACEHOLDER / INERT** | Generic string quick-log and sample record only. | Opportunity times, calculated duration, quality/energy enums, corrections, History/trends/Goals. |
| 12 | Money | **PLACEHOLDER / INERT** | Generic string quick-log only. | Typed money records, currency, categories, budgets, savings Goals, corrections and History. |
| 13 | Hobbies | **PLACEHOLDER / INERT** | Generic string quick-log only. | User hobbies/projects, typed measures, notes, multiple sessions, category/individual Goals and History. |
| 14 | Social | **PLACEHOLDER / INERT** | Generic string quick-log only. | Event/category/who/duration/notes/alcohol/social-link model without duplicate records. |
| 15 | Alcohol | **PLACEHOLDER / INERT** | Generic string quick-log only. | Explicit none, amount spent, duration, occasion, exception, History and behavioural rule calculations. |
| 16 | Supplements / medication / recovery | **PLACEHOLDER / INERT** | Generic string quick-log only. | User items/protocols/schedules, one-tap states, temporary lifecycle and History. |
| 17 | Home / Today | **PLACEHOLDER / INERT** | Forest opens and Round-Up modal opens; four compact widgets show static content and have no actions. | Query real due state; make every widget actionable; quick logs, corrections, Goal detail, recent-record editing and explicit unavailable states. |
| 18 | Daily Round-Up | **PLACEHOLDER / INERT** | Modal state works, but Confirm only closes it. Options do not match directive exactly. | Real unresolved-item summary, Bad/OK/Great rating, negative habits, save/confirm/edit/recalculate and separation from Goal achievement. |
| 19 | Modes | **PLACEHOLDER / INERT** | Three local buttons and a multiplier unit test. | Persisted configurable Modes, dated activation, Goal/routine overrides, protected pauses and return-to-Normal semantics. |
| 20 | Goal Sets | **PLACEHOLDER / INERT** | One hard-coded set. | CRUD, Goal membership, periods, reuse, history, completion and derived overall achievement. |
| 21 | Calendar / planning | **PLACEHOLDER / INERT** | Static September grid; controls and days are inert. | Day/week/month, planned items, recurrence, state transitions and rescheduling distinct from failure. |
| 22 | Weekly / monthly reviews | **PLACEHOLDER / INERT** | Hard-coded review copy; New Review is inert. | Generate from real data, configured week start, comparisons, reflection/rating, persistence and correction recalculation. |
| 23 | History / search | **PLACEHOLDER / INERT** | Sample contribution timeline and sample-only search; result rows do nothing. | Unified query, filters/date range/Goals/categories/numeric search, record detail/edit, seven-day correction and dependent recalculation. |
| 24 | Streaks / PBs / milestones | **PARTIAL** | Forest growth/streak helpers and in-workout PB comparison exist. Displayed values are samples. | Persist/derive system-wide facts, N/A/Mode rules, corrections, milestones and Days Present integration. |
| 25 | Basic insights | **PLACEHOLDER / INERT** | Four static cards. | Explainable query-derived correlations/trends with evidence range, positive/attention balance and disable controls. |
| 26 | Notes / journal | **PLACEHOLDER / INERT** | Generic string quick-log only. | Daily/standalone/attached notes, journal view, private ownership and History. |
| 27 | Account / settings | **PLACEHOLDER / INERT** | Hard-coded name/email, local-only toggles, no app-wide auth gate; Edit/Profile/Privacy/Connected Services inert. | Authenticated profile, credential management, preferences, security, units/currency/time formats, export, logout and account deletion. |
| 28 | Export | **PARTIAL** | Browser download works but exports sample data only and has no scope controls. | Query owned structured data; Everything/Module/Date Range; versioned schema and validation. |
| 29 | Forest | **PARTIAL** | Forest view/Lab and deterministic foundations work with sample Goal state. | Preserve and connect future hooks only; regression tests. No production expansion this week. |
| 30 | Persistence / privacy | **PARTIAL** | Training and database Habit tables use owner-scoped RLS. Other app data is absent or local. | Canonical owned schema/repositories, one-record/many-contributions links, cross-user tests, refresh/cross-device journeys, transactional writes. |
| 31 | Responsive / PWA / offline / errors | **PARTIAL** | Responsive CSS, manifest, service worker, icons and Training offline queue exist. | Device QA, authenticated startup, general loading/empty/error/reconnect states, update UI, reduced-motion application and offline policy by action. |
| 32 | Automated testing | **PARTIAL** | 19 unit tests pass; mainly Forest and Training calculations. | Domain rules, repositories, RLS isolation, refresh/cross-device, correction recalculation, browser journeys, responsive smoke and existing Forest regression. |

## Dependency-ordered implementation sections

### Section A — Release and architecture baseline

- [ ] Make the production Vite line the unambiguous working baseline.
- [ ] Bring the five live Supabase migrations into version control without altering production data.
- [ ] Generate committed database types.
- [ ] Establish repository/service boundaries so UI components never write ad hoc records.
- [ ] Add CI gates: typecheck, unit tests, integration tests, production build.
- [ ] Preserve current Forest and Training regression tests.

**Exit:** a clean branch can reproduce and safely evolve the live schema.

### Section B — Auth, account and ownership foundation

- [ ] Add app-wide session bootstrap and signed-in/signed-out routes.
- [ ] Make Account display the authenticated profile, never sample identity.
- [ ] Complete profile and preference fields: timezone, unit system, currency, date/time, week start.
- [ ] Implement logout, password/email management and account deletion flow.
- [ ] Enable leaked-password protection in Supabase Auth.
- [ ] Add authenticated two-user RLS isolation tests.

**Exit:** every following journey has a real owner and survives refresh/device change.

### Section C — Canonical data foundation

- [ ] Define controlled measurement types, units, conversions and custom units.
- [ ] Add fixed Areas and owned effective-dated subcategories.
- [ ] Add tracker definitions and schedules/lifecycle.
- [ ] Add canonical records with structured numeric value/unit, occurrence time, notes and source module.
- [ ] Add many-to-many record-to-Goal contribution links: one real action, one record.
- [ ] Add audit/correction metadata and archive semantics.
- [ ] Write unit/conversion/history-integrity tests.

**Exit:** `80 kg` is numeric `80` + `weight` + `kg`; categories and records are owned, typed and queryable.

### Section D — Goals vertical slice

- [ ] Goal create/edit/detail and lifecycle states.
- [ ] Effective-dated Goal rules and target snapshots.
- [ ] Exact/min/max/range; finite/permanent/maintenance; Negotiable/Non-Negotiable.
- [ ] Tracker contribution configuration and derived calculations.
- [ ] Prune, complete, rest, resume, end/archive/delete confirmation.
- [ ] Goal Sets and basic Mode interaction foundations.
- [ ] Goal History and correction recalculation tests.

**Exit:** create Goal → link tracker → record value → refresh → progress is derived → correct record → progress recalculates.

### Section E — Track management plus Habits, Metrics and Routines

- [ ] Replace generic string QuickLog with type-specific flows.
- [ ] Complete tracker management and history-safe archive/delete.
- [ ] Wire Habits schema/UI and implement all status semantics, especially Missing ≠ Failed.
- [ ] Complete typed Metrics and reading history/trends.
- [ ] Complete Routine definitions/variants/adherence.
- [ ] Link all three to Goals, History and categories.

**Exit:** each advertised create/configure/record/edit/refresh/history/Goal journey works across devices.

### Section F — Home / Today and Daily Round-Up

- [ ] Replace static date/name/counts with live queries.
- [ ] Make every visible widget open or perform its advertised action.
- [ ] Add Today quick entry and correction flows.
- [ ] Implement unresolved items and Daily Round-Up confirmation/edit/recalculation.
- [ ] Keep Home compact and responsive.

**Exit:** no polished inert controls remain on Home.

### Section G — Unified History, search and correction engine

- [ ] Global History backed by canonical records.
- [ ] Date/range/module/category/subcategory/Goal filters and search.
- [ ] Record detail, seven-day correction/backdating and destructive confirmation.
- [ ] Recalculate Goals, reviews, streaks, PBs and insights after correction.

**Exit:** every record is findable, correctable and reflected consistently downstream.

### Section H — Remaining module vertical slices

Complete one at a time using the same end-to-end contract:

1. [ ] Sleep
2. [ ] Physical Activity / Cardio
3. [ ] Nutrition
4. [ ] Money
5. [ ] Hobbies
6. [ ] Social + Alcohol shared-record model
7. [ ] Supplements / Medication / Recovery
8. [ ] Notes / Journal

**Exit per module:** configure → record → persist → refresh → history → edit → Goal/review recalculation.

### Section I — Finish Training without replacing it

- [ ] Verify Google Sheet-to-Supabase row parity before changing the backup.
- [ ] Make session save atomic or recoverable.
- [ ] Add session and exercise History, editing/correction and deletion policy.
- [ ] Complete Cardio, Session 0, Normal/Rehab/Light and multiple sessions/day.
- [ ] Persist or reliably derive PB/progression outputs and Goal contributions.

**Exit:** the directive's complete Training journey passes with imported and new sessions.

### Stored future Forest package

The approved Forest V1 visual boards and canonical specification are preserved in [`docs/forest-v1-reference`](forest-v1-reference/README.md). They are locked for later implementation and do not change this week's functional V1 priorities. The product name is Fovyn while the previously approved Forbair visual identity remains authoritative.

### Section J — Planning and feedback systems

- [ ] Full Modes and protected expectation logic.
- [ ] Goal Sets.
- [ ] Calendar Day/Week/Month and recurrence/rescheduling.
- [ ] Weekly/monthly Reviews from real data.
- [ ] Streaks, PBs and milestones.
- [ ] Basic explainable Insights.

**Exit:** planning remains distinct from Goals, and feedback is derived from corrected real records.

### Section K — Export, PWA, resilience and responsive QA

- [ ] Structured export by Everything/Module/Date Range.
- [ ] Phone/tablet/desktop layouts and interactions.
- [ ] Installed update path, startup/session restoration and cache versioning.
- [ ] Loading, empty, offline, reconnect and failed-request states.
- [ ] Reduced motion and accessibility checks.

**Exit:** V1 is usable on phone and desktop, installed or refreshed, with honest failure states.

### Section L — End-to-end acceptance and production launch

- [ ] Run the directive's Metric, Training and Money example journeys.
- [ ] Run two-user privacy/RLS suite.
- [ ] Run cross-browser refresh and another-device/session tests.
- [ ] Confirm no visible inert action and no sample private data.
- [ ] Run production migration/advisors/build/tests and deploy.
- [ ] Post-deploy smoke and rollback verification.

## Tomorrow's section-by-section checklist

The requested order is retained, with only the minimum technical prerequisites embedded in the first two sections.

### 1. Goals

- [ ] Lock the Goal state machine and effective-dated rule model.
- [ ] Establish the minimal structured target/unit and Area/subcategory references required by Goal creation.
- [ ] Create owned Supabase Goal/rule/contribution schema with RLS.
- [ ] Implement create, edit, detail, rest/resume, complete/end/archive and confirmations.
- [ ] Derive progress from records; never store a competing manual progress value.
- [ ] Test refresh, correction, historical rule integrity and cross-user isolation.

### 2. Categories/subcategories + structured measurements/units

- [ ] Complete controlled catalogue, profile defaults and custom unit path.
- [ ] Complete fixed Areas and owned subcategory lifecycle/history.
- [ ] Remove string numerical fields from the new Goal/record paths.
- [ ] Add unit conversion and subcategory archive-integrity tests.

### 3. Track management

- [ ] Tracker schema/repository and lifecycle.
- [ ] Type-specific Add flows for Habits and Metrics first.
- [ ] Schedules/settings/category/unit editing.
- [ ] Archive-with-history and destructive confirmation.

### 4. Home / Today widgets

- [ ] Live Today query model.
- [ ] Habits complete/N/A/undo.
- [ ] Metric quick entry/correction.
- [ ] Training manual/template launch.
- [ ] Goals detail, Round-Up, recent record/edit and correct module routing.

### 5. Supabase persistence/integration

- [ ] Complete repository wiring for all work above.
- [ ] Refresh and second-session parity.
- [ ] RLS isolation and transactional/dependent recalculation tests.

### 6. Phone / desktop testing

- [ ] Core journeys at phone and desktop breakpoints.
- [ ] Keyboard, loading, empty, error, offline/reconnect and installed PWA checks.
- [ ] Production smoke after deployment.

## Tomorrow's hard completion gate

Do not move past the tomorrow scope until:

1. Goals, Track, and every visible Home widget perform their advertised action.
2. All resulting data is owned in Supabase and survives refresh.
3. Numerical targets and records are structured, not opaque strings.
4. History and Goal progress reflect creation and correction.
5. Phone and desktop journeys pass.

## Current blockers

- **No credential blocker:** Supabase project inspection is working.
- **No immediate product blocker:** the directive is sufficient to begin the foundation and Goal work.
- **Release-risk item:** current production migrations must be captured in the repository before the first new schema migration.
- **Later verification dependency:** Training migration cannot be declared complete until Google Sheet row parity and historical edge cases are checked; the Sheet must remain untouched.
