# Forest V1 asset pipeline

## Authoritative boundary

- Supabase Storage bucket: `fovyn-assets`
- Manifest table: `public.forest_asset_manifest`
- Production code resolves semantic keys through `getForestAsset()`.
- Forest state stores semantic identity and never literal image URLs.
- Reference boards are `reference_only` and cannot be read through the public application policy.
- The public bucket is for static Fovyn application artwork only. Future user uploads require a separate private bucket and separate policies.

## Versioned Storage paths

Production uploads use these prefixes:

- `forest/v1/trees/01/` through `forest/v1/trees/27/`
- `forest/v1/environments/nursery/`
- `forest/v1/environments/clearing/`
- `forest/v1/environments/areas/{health,mind,self,people,work,wealth}/`
- `forest/v1/environments/dormant-woods/`
- `forest/v1/environments/heartwood/`
- `forest/v1/icons/`
- `forest/v1/brand/`
- `forest/v1/reference/`

Use immutable filenames that include the asset version, for example `tree-stage-04.v1.webp`. Set long-lived cache control on uploaded production files. Replacements use a new manifest version and new filename; never overwrite a cached production path in place.

## Current asset audit — 2 September 2026

Present and production-usable:

- Approved standalone Fovyn F mark is available locally and already represented by the app's current brand files.

Present but reference-only:

- Six approved Area direction boards: Health, Mind, Self, People, Work and Wealth.
- Approved 27-stage Tree ladder/contact boards.
- Forest-first UI concepts, environment-kit boards and other visual-direction boards in the supplied folder.

Missing production masters:

- 27 individual transparent canonical Tree assets.
- Nursery, Clearing, Health, Mind, Self, People, Work, Wealth, Dormant Woods and Heartwood clean environment masters.
- Any responsive derivatives required after clean masters are tested.

The boards contain text, palettes, thumbnails or UI and must not be rendered as production environments. Forest V1 renderer work remains blocked until the missing clean masters are supplied and the 27 Tree identities plus all 10 environments pass the required visual QA.

