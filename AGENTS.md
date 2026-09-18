# Fovyn development workflow

- `main` is the stable Alpha/production branch. Do not commit ordinary feature work to it.
- `develop` is the default branch for all ongoing Fovyn development.
- Only merge or push `develop` to `main` when Adam explicitly requests an Alpha release.
- Alpha hotfixes start from `main`, are verified and deployed there, then must be merged or cherry-picked into `develop`.
- Database, Storage, Auth, email, notification, and destructive work must identify the target application environment before mutation. Default to Development.
- Alpha and Development temporarily share Supabase project `ukvrfejyyhgnzljquxvt`. Every shared-backend migration must remain backward-compatible with the current `main` application and follow expand → migrate → release → contract.
- Never copy Alpha users' private data into Development. Use Adam's authorised test data, Test Mode, or synthetic fixtures.
- Development asset experiments use `development/`-prefixed versioned identities in shared Storage. Never replace published Alpha assets during experimentation.
- Alpha URL: `https://fovyn-plum.vercel.app/`.
- Persistent Development URL: `https://forbair-git-develop-adamonelife-9151s-projects.vercel.app/`.
- `docs/development-environments.md` is authoritative for shared-backend safeguards, required configuration, callbacks, migrations and releases.
