# Alpha and Development environments

## Branches

| Environment | Git branch | Purpose | Promotion |
| --- | --- | --- | --- |
| Alpha | `main` | Stable application used by external Alpha testers | Hotfixes or an explicitly approved release only |
| Development | `develop` | Adam's active V1/V1.5 build and internal QA | Never automatically promoted |

Normal work is committed to `develop`, deployed to the persistent Development URL, tested by Adam, and grouped into a coherent release. It reaches `main` only after Adam explicitly asks to release, merge, or deploy it to Alpha.

An Alpha hotfix is made from `main`, verified in Alpha, then merged or cherry-picked into `develop` so Development cannot lose the fix.

## Hosting

- Alpha: `https://fovyn-plum.vercel.app/`
- Development: persistent `develop` branch alias/domain (record here after provisioning)
- Set `VITE_FOVYN_ENVIRONMENT=development` only for Development. This displays `DEVELOPMENT · DEV DATA`.
- Preview deployments must be protected for Adam and authorised internal testers.

## Supabase

- Alpha project: `ukvrfejyyhgnzljquxvt`
- Development project/branch: record its reference here after provisioning.
- Development uses separate Database, Storage and Auth configuration.
- Do not clone Alpha user data. Use synthetic fixtures, Super Admin Test Mode, or explicitly authorised test data.
- Develop migrations against Development first. Promote the same reviewed migration to Alpha only with a compatible approved application release.

## Auth and outbound communications

- Alpha verification links return only to the Alpha URL.
- Development verification links return only to the Development URL.
- Development emails, reminders, invitations and notifications must be suppressed or restricted to authorised test recipients.

## Assets

Forest environments, Trees, icons and other assets are versioned and environment-scoped. Development experiments must never overwrite an Alpha storage identity.

## Release checklist

1. Verify the coherent batch in Development.
2. Review migrations, Storage, Auth redirects, outbound messages and data handling.
3. Obtain explicit Alpha release approval.
4. Apply compatible migrations/configuration to Alpha.
5. Merge the approved batch to `main` and verify Alpha.
6. Ensure any intervening Alpha hotfixes remain present in `develop`.
