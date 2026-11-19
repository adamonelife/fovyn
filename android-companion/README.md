# Fovyn Health Android companion

Foreground-only Kotlin companion for Fovyn V1.3. It reads a rolling 14-day Health Connect window and securely upserts it through the authenticated Supabase health-sync Edge Function.

## Test installation

1. Download fovyn-health-debug.apk from the GitHub Actions artifact for the V1.3 commit.
2. On the primary Samsung phone, allow installation from the browser/files app used to open the APK.
3. Install and open Fovyn Health.
4. Sign in with the same Fovyn email and password.
5. Tap Grant / review permissions and allow steps, active calories, exercise, sleep, heart rate and distance.
6. In Samsung Health, confirm Settings → Health Connect → App permissions → Samsung Health has the matching data enabled, then open Samsung Health once.
7. Return to Fovyn Health and tap Sync now.
8. Open Fovyn → Weekly to see the imported metrics.

The debug APK is signed by the GitHub build and is intended only for Adam's physical-device validation. Background sync is intentionally not enabled until foreground reconciliation has been verified.
