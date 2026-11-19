# Forest / Trees archive

Forest is archived from the active daily experience, not removed. `activePresentation` in `src/adam/presentation.ts` defaults `forest` to false; a future build with `VITE_FOVYN_FOREST_ENABLED=true` restores the existing presentation. The feature flag does not change data access, records, progression, ownership, or RLS. No Storage objects or database tables are deleted.

- The Forest Hero, Overview, scenes, renderer, Tree Guide, Lab, calibration, manifests, artwork and assets remain in the repository and existing Storage.
- Goals continue to use their original evaluation rules and related source contributions. Forest progression is coupled to shared Goal evaluation; do not disable the common evaluation or source-contribution functions. Existing goal lifecycle events, stage awards, grove relationships and historical records remain intact.
- The inactive presentation does not mount Forest Hero/Overview or the lazy Forest Lab. It hides goal-specific tree artwork/progression from the active UI. Forest-specific UI work is avoided when the feature is off.
- Reactivation: set the build flag, rebuild the existing app, and smoke-test Goal evaluation and tree rendering with Test Mode. Do not reseed or recreate historical trees.

Nutrition screenshot import and Android Health Connect are successive features, independent of Forest.
