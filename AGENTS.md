# Fovyn development workflow

- `main` is the stable Alpha/production branch. Do not commit ordinary feature work to it.
- `develop` is the default branch for all ongoing Fovyn development.
- Only merge or push `develop` to `main` when Adam explicitly requests an Alpha release.
- Alpha hotfixes start from `main`, are verified and deployed there, then must be merged or cherry-picked into `develop`.
- Database, Storage, Auth, email, notification, and destructive work must identify the target environment before mutation. Default to Development.
- Develop and test schema changes in the isolated Supabase Development environment using committed migrations before promoting them to Alpha.
- Never copy Alpha users' private data into Development. Use Adam's authorised test data, Test Mode, or synthetic fixtures.
- Development assets use versioned identities and Development storage. Never replace Alpha assets during experimentation.
- Alpha URL: `https://fovyn-plum.vercel.app/`.
- Record the persistent Development URL, Supabase reference, and callback URLs in `docs/development-environments.md` once provisioned.

