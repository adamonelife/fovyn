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

## Current asset audit — 3 September 2026

Present, uploaded and production-ready:

- 27/27 individual transparent canonical Tree masters.
- 10/10 clean environment masters: Nursery, Clearing, six Areas, Dormant Woods and Heartwood.
- 29/29 individual custom SVG icons.
- Approved standalone Fovyn F mark is available locally and represented by the app's current brand files.
- Supabase Storage contains all 66 production objects and the manifest marks all 27 Trees, 10 environments and 29 icons ready.

Reference-only materials remain separate:

- Six approved Area direction boards: Health, Mind, Self, People, Work and Wealth.
- Approved 27-stage Tree ladder/contact boards.
- Forest-first UI concepts, environment-kit boards and other visual-direction boards in the supplied folder.

The boards contain text, palettes, thumbnails or UI and must not be rendered as production environments. Runtime derivatives remain optional and must preserve the approved masters. Forest Lab now performs manifest-backed Tree, ground-anchor and environment QA using the same assets as the live renderer.
