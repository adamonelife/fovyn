# Fovyn Health permanent Android signing

Fovyn Health production APKs use one permanent PKCS12 signing key. The key and passwords are never stored in Git.

## Required Actions secrets

- `FOVYN_ANDROID_KEYSTORE_BASE64`
- `FOVYN_ANDROID_KEYSTORE_PASSWORD`
- `FOVYN_ANDROID_KEY_ALIAS`
- `FOVYN_ANDROID_KEY_PASSWORD`
- `FOVYN_ANDROID_CERT_SHA256`

The signed release workflow fails closed when any secret is absent. It does not fall back to debug signing.

## Release process

Run **Fovyn Health signed release** from GitHub Actions and supply a semantic version such as `1.2.0`.

The workflow:

1. Restores the encrypted keystore from Actions secrets.
2. Uses the stable `com.fovyn.health` application ID.
3. assigns a monotonically increasing release `versionCode`.
4. Runs Android tests and builds the release APK.
5. Verifies the APK certificate against the pinned SHA-256 fingerprint.
6. Compares its application ID, certificate and version code with the previous permanent release.
7. Publishes direct APK and ZIP downloads.

Release assets are never replaced after publication.

## Key recovery

Keep the original `fovyn-health-release.p12`, alias and passwords in a secure password manager or encrypted backup. Losing this key means future APKs cannot update existing installations.

Do not rotate the key. If a rotation is ever unavoidable, it requires an explicit migration strategy and is not part of the normal release workflow.

## One-time migration from test builds

The existing test APK was signed with a temporary debug certificate. Android cannot install the first permanently signed APK over that build.

For the first permanent release only:

1. Confirm the latest health data has reached Fovyn.
2. Uninstall the debug-signed Fovyn Health app.
3. Install the permanently signed APK.
4. Sign in and grant Health Connect permissions once.

Every subsequent permanently signed APK can be installed directly over the existing app, preserving its local login and permissions.
