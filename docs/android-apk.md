# Android APK — Cửu Huyền

The Android app packages the existing production game with Capacitor 8. It uses
the same Supabase backend as the web build. It is not a conversion to a different
game engine. Maps, character creation and multiplayer remain the existing game.

## Build a test APK on Windows

Requirements: Node 22+, JDK 21, Android SDK platform 36 and build tools 36.0.0.
Install dependencies with `npm ci` first.

For a portable toolchain inside this project, read and accept Google's
[Android SDK terms](https://developer.android.com/studio#terms), then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-android.ps1 -AcceptSdkLicense
npm run android:apk
```

The setup script downloads Google's command line tools and Eclipse Temurin JDK,
checks SHA-256 hashes and keeps tools/caches under ignored `.android-tools/`.
It does not change system environment variables. Existing `JAVA_HOME` and
`ANDROID_HOME` can also be used by the build script. The first build downloads
Gradle and Maven dependencies; subsequent builds reuse its local cache.

Output: `artifacts/android/cuu-huyen-debug.apk` and its SHA-256 sidecar. The script
verifies the APK signature before exporting it. The debug signing key stays in
`.android-tools/debug.keystore`; keep it for installing subsequent updates over
the same app. Never use this key to publish a production app.

Build uses `.env.local` / existing Vite public Supabase configuration. Never put
service-role/admin secrets in `VITE_*` variables. No environment file, dashboard,
source art or SDK/JDK is included in the APK. `dist-android/android-assets-report.json`
records packaged assets. Lossless originals with verified delivery variants are
omitted; necessary WebP images, metadata and unmapped runtime files are retained.

## Install and check

Copy the APK to an Android 7.0+ device and allow installation from the app used to
open it. Or connect a device with USB debugging and use:

```powershell
.android-tools/sdk/platform-tools/adb.exe install -r artifacts/android/cuu-huyen-debug.apk
```

Test login, character creation, entering Vương Gia Thôn, travel, menus, typing in
landscape, a duel, switching apps and returning. Native Back closes typing/chat/
cards/menus first. Two Back presses at the game root save and minimize; Back does
not forfeit a duel or automatically accept rewards/confirmation dialogs.

Android locks to landscape on phones, hides system bars (swipe to reveal), keeps
the screen awake while playing, and resizes for the keyboard. The game ships
locally; online login/multiplayer still need Internet. Browser storage and native
app storage are separate; use the same account for cloud progress. Android may
still suspend the app in the background: online combat continues on the server.

## Change the app icon

To replace the installed application's icon, save the original square artwork to
`art/android/app-icon.png`, then generate the Android density resources:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-icons.ps1
```

The generator preserves the complete image and adds transparent padding to the
adaptive foreground for Android launchers. The application manifest uses
`@mipmap/cuuhuyen_launcher` for both `android:icon` and `android:roundIcon`.
`npm run android:apk` regenerates these resources before building. Installing the
new APK with the same debug key updates the existing app.

## Future release

Package ID is `com.cuuhuyen.game`, version code 4 (1.0.3). This is a signed **debug test**
APK, not a Play Store release. Before publishing, select a permanent identifier,
configure a private release signing key and prepare a release AAB, store listing
and any required platform integrations. Real-money purchases are not enabled by
this packaging step.

References: [Capacitor Android](https://capacitorjs.com/docs/android),
[App lifecycle](https://capacitorjs.com/docs/apis/app).

## 1.0.2 character rendering

- Sharp quality uses the actual device pixel ratio within an 8 MP / GPU texture
  limit. Coarse device-memory hints no longer force sharp mode down to DPR 1.5/2.
  Explicit light/balanced settings and recovery modes retain their limits.
- Adult world characters, other players, NPCs and wandering cultivators render at
  85% of their previous size on mobile. Proportions and feet stay anchored; children,
  PC sizes, collision, movement and combat distances are unchanged.
- Wang Lam's sword follows corrected hand positions in all 64 running poses and
  shares the displayed body's scale, facing and foot position, including cosmetics.

Validation: 16 unit tests; 13 production-browser checks, including real DPR 2.75
at 844×390, adult/NPC/peer scale, the raised running fist and restoring PC sizes.
APK production build and signing verification passed. Physical Android-device
visual/performance testing is still required; browser checks do not measure a
particular phone's GPU performance.
