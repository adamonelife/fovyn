# Fovyn V1 remaining roadmap

1. Guidance & Discovery V1
2. Forest Asset Preparation / Production Forest V1
3. Training Exercise Name Standardisation
4. Canopy Beta V1
5. Money Interest Transaction Type
6. Private Cycle Tracking Foundation
7. UX Friction / Global Polish
8. Analytics Foundation / Population Insights Skeleton
9. Full QA
10. Minimum Beta Security Gate
11. Friends Beta

## After Friends Beta, before V1.5

12. Full Safety/Admin + Population Insights Platform

## Guidance & Discovery V1 scope

This Friends-Beta gate makes Fovyn independently understandable through two
complementary systems: structured, contextual suggestions that answer “What
could I create?” and stateful just-in-time introductions that answer “What
does this do?”. It must not become a long signup tour or a persistent layer of
explanatory copy.

Suggestions are curated and rule-based in V1, understand the six canonical
Areas, and pre-populate editable structure for relevant Goals, Habits,
Metrics, Training, Nutrition, Money and subcategory creation. Suggestions are
never canonical records until the user reviews and saves them, and every
supported flow must retain a clear Custom route. Suggestion definitions must
live in a shared structured taxonomy rather than being scattered through UI
components, with architecture for later Super Admin management and optional
personalisation without implementing an AI recommendation engine in V1.

First-use guidance is concise, contextual and versioned. Seen state must be
persisted per user across devices, shown once by default, deliberately
replayable through Help, and resettable only for Test Data through Super Admin
Test Mode. Required introductions cover Goals and first Goal concepts, Log,
History, Forest and its relevant environments, Tree Guide, enabled specialist
modules, Canopy Beta and private Cycle Tracking. Guidance teaches Fovyn
concepts when they become relevant; it does not explain ordinary controls or
interrupt simple actions.

Beta verification must cover a genuinely new account, an established account,
all six Area suggestion sets, editable suggestion defaults, the Custom path,
cross-device seen-state persistence, Help replay and Test Mode reset. Existing
privacy-conscious analytics may record non-sensitive suggestion and tutorial
interaction events, but must not collect user-created content unnecessarily.

## Private Cycle Tracking Foundation scope

This optional, private-by-default V1 module establishes canonical reproductive-health data, fast logging and a calm Cycle timeline without becoming a full fertility product. It includes enable/disable controls; period start/end, daily flow and spotting; optional symptoms, mood, libido and simple protected/unprotected sex logging; pregnancy-test records and a basic pregnancy-state foundation; cycle and period history; clearly labelled estimated next-period and PMS windows; restrained late-period handling; discreet notification preferences; record deletion/export readiness; Super Admin test fixtures; and analytics-ready links to existing canonical facts.

Cycle data must never be shared automatically or duplicated across modules. Future sharing must be explicit, revocable and granular, with sexual activity separately permissioned. Predictions are estimates, must never describe a day as safe contraception, and must not automatically alter training or nutrition targets. Advanced personalised predictions, correlations, richer fertility and pregnancy features, health integrations and partner-sharing UX remain V1.5 work.

## Money Interest Transaction Type scope

This contained post-Canopy V1 amendment adds Interest as a first-class Money
transaction type with an explicit Earned or Charged direction. Users enter a
positive amount, the selected Account supplies the canonical native currency,
and the existing Money engine increases or decreases that Account balance
without creating a generic Income, Expense, Transfer or Adjustment record.

Money History and filters must preserve the Interest identity and direction.
Headline Income and Spending remain ordinary transactions; Net includes
Interest Earned positively and Interest Charged negatively, while Transfers
remain neutral. Interest must reuse the shared multi-currency reporting,
Guidance, mobile controls and canonical record architecture so future bank
imports can map interest credits and charges without a parallel accounting
system. Existing Alpha records must not be guessed or reclassified unless
their meaning is unambiguous.

## Training exercise-name standardisation scope

This block separates canonical movement identity from each private user Exercise Profile and optional user alias. It must preserve Exercise IDs, machine-specific profiles, Templates, Workout History, PBs, progression, loads, repetitions and notes.

High-confidence migrated shorthand may be mapped in batch while preserving the original name as the alias. Ambiguous names require user review and must not be guessed or auto-merged. New Exercise creation should search and suggest an expandable curated canonical dictionary, while still allowing custom Exercises. Search covers both canonical names and aliases. Canonical movement keys may support future de-identified analytics; aliases remain private personal data.

## Analytics scope boundary

The V1 analytics block establishes privacy-conscious architectural readiness only: canonical facts, stable internal identifiers and taxonomies, occurrence-time semantics, structured demographics, provenance, a separated controlled analytics layer, de-identified analytical keys, aggregate proof views, and documentation.

It does not include commercial dashboards, customer accounts, reports or datasets; raw individual exports; advertising profiles; public benchmarks; final privacy thresholds; or the full Population Insights product.

Population analytics must count each canonical real-world fact once, use immutable internal identity rather than email or user-facing names, derive age dynamically from date of birth, distinguish safety classes from changeable reporting bands, exclude private free text by default, preserve configured-timezone day semantics, and keep protected minor data identifiable for policy enforcement and excluded from future commercial aggregates by default.

## Guidance Definition of Done

Every new user-facing feature must consider first-use explanation, a useful empty state, structured suggestions with a Custom route, contextual sub-feature education, replayable Help, versioned user-level state, mobile and accessibility behaviour, and Super Admin Test Mode QA/reset. Guidance teaches unfamiliar Fovyn concepts rather than ordinary controls. Guidance design is part of feature design and must not be deferred as a later retrofit.

The post-Beta phase owns privacy/legal review, consent and legal-basis decisions, cohort thresholds, rare-combination suppression, re-identification protection, query auditing, stronger de-identification, Admin controls, and the eventual internal/commercial Population Insights platform.
