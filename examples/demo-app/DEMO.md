# rn-pushdeck demo app

A minimal React Native + Expo app that wires `@asyncarijit/rn-pushdeck` end-to-end. Use this to demo OTA updates working in production.

## Prerequisites

- Node 20+
- Java 17 (for Android builds — comes with Android Studio)
- Android Studio with an SDK + emulator OR a real Android device with USB debugging enabled

## Step 1 — Create a dashboard project

1. Open https://rn-pushdeck.vercel.app and sign in
2. Click **New project** → name it "Demo App"
3. Copy the `psh_xxxxxxxxxx` project key

## Step 2 — Create an API token

1. Go to **Settings → API tokens** in the dashboard
2. Click **New token** → name it "demo deploys"
3. Copy the `pdkt_...` value once (you won't see it again)

## Step 3 — Configure the demo app

Set the project key. Two options:

**Option A — env var (recommended):**
```bash
# Windows PowerShell
$env:EXPO_PUBLIC_PUSHDECK_PROJECT_KEY = "psh_yourkey"

# bash / zsh
export EXPO_PUBLIC_PUSHDECK_PROJECT_KEY=psh_yourkey
```

**Option B — edit `App.tsx`:** replace `psh_PASTE_YOUR_KEY` with your key.

## Step 4 — Generate native code

Expo apps don't have a native `android/` folder by default. Generate one:

```bash
npx expo prebuild --platform android
```

This creates `android/` with `MainApplication.kt` inside.

## Step 5 — Add the bundle-loader override

After `prebuild`, find:

```
android/app/src/main/java/com/anonymous/demoapp/MainApplication.kt
```

(Path varies — the folder names match your `app.json`'s `android.package`. Default is `com.anonymous.demoapp`.)

Open that file. Find the part that looks like:

```kotlin
override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> = ...
      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    }
)
```

**Add this method inside the `object` block**, and add `import java.io.File` at the top of the file:

```kotlin
override fun getJSBundleFile(): String? {
  val bundlePath = applicationContext.filesDir.absolutePath + "/index.android.bundle"
  val bundleFile = File(bundlePath)
  return if (bundleFile.exists()) bundlePath else super.getJSBundleFile()
}
```

That 6-line override is the entire native side of the SDK. Without it, the app loads the JS bundle baked into the APK and ignores anything downloaded by the SDK.

## Step 6 — Build + install the APK

```bash
npx expo run:android
```

This compiles a release APK, installs it on your connected emulator/device, and starts the Metro bundler. Wait ~3-5 minutes for the first build.

The app should open showing:
- "rn-pushdeck demo"
- "v1.0.0"
- The project key
- "Checking for updates…" → "You're on the latest version" (because no bundle is promoted yet)

## Step 7 — Make a code change + bundle it

Edit `App.tsx`:

```ts
const BUILD_VERSION = '1.0.1';  // bump
const SHIPPED_AT = '2026-05-11 — first OTA update via rn-pushdeck';
```

Also change something visible — e.g., change the title color from `#fafafa` to `#22c55e` (green).

Build a production bundle:

```bash
npx expo export:embed --platform android --bundle-output ./bundle.js --dev false --reset-cache
```

That writes `bundle.js` containing your new code.

## Step 8 — Deploy via the CLI

```bash
npx @asyncarijit/pushdeck-cli login --token pdkt_yourtoken

npx @asyncarijit/pushdeck-cli deploy \
  --project psh_yourkey \
  --version 1.0.1 \
  --bundle ./bundle.js \
  --promote production \
  --notes "First OTA update"
```

You should see:

```
• Deploying v1.0.1 (X.X KB bundle)
  Resolving project... done (Demo App)
  Requesting upload URLs... done
  Uploading bundle... done
  Registering bundle... done
  Promoting to production... done
✓ Shipped v1.0.1 to production
```

## Step 9 — Receive the OTA update

Back on your phone/emulator, **tap "Check for updates"** in the app.

You should see:
- "Update available: v1.0.1"
- "First OTA update" (your release notes)
- A green "Download & restart" button

**Tap "Download & restart"**. The SDK:
1. Downloads `bundle.js` from Cloudflare R2
2. Saves it to `filesDir/index.android.bundle`
3. Stores the version in AsyncStorage
4. Restarts the app

The app reopens — now showing v1.0.1 with whatever change you made.

**You just shipped an OTA update.** No Play Store, no review, no waiting.

## What's actually happening

```
Your terminal
    │
    │  pushdeck deploy
    ↓
Cloudflare Worker (rn-pushdeck-api)
    │
    │  presigns R2 URL
    ↓
Your terminal
    │
    │  PUT bundle.js
    ↓
Cloudflare R2 (global CDN)
    │
    │  stored at /psh_xxx/v1.0.1/index.android.bundle
    │  publicly downloadable
    ↓
Your terminal
    │
    │  registers bundle + promotes to production
    ↓
Cloudflare Worker
    │
    │  channels.current_bundle_id = new bundle
    ↓
Neon Postgres
    │
    │  audit row written
    ↓
Your phone (tap "Check for updates")
    │
    │  GET /v1/manifest/psh_xxx/production
    ↓
Cloudflare Worker
    │
    │  returns { version: "1.0.1", bundleUrl: "..." }
    ↓
Your phone
    │
    │  GET pub-xxx.r2.dev/.../index.android.bundle
    ↓
Cloudflare R2 (served from your nearest edge)
    │
    │  bundle bytes downloaded
    ↓
Your phone
    │
    │  writes to filesDir, restarts
    ↓
Android OS reloads MainApplication
    │
    │  getJSBundleFile() returns the downloaded file
    ↓
React Native runs new code
```

Total time from `pushdeck deploy` to "new code running on phone": ~5 seconds + however long the user waits to tap the button.

## Resetting the demo

If you want to "uninstall" updates and test from scratch:

1. On the phone: long-press the app → App info → Storage → **Clear storage** (wipes filesDir + AsyncStorage)
2. Open the app — it's back to the APK-baked version

This simulates a brand-new install. The SDK has no record of any version, so it'll start from `DeviceInfo.getVersion()` (the APK version).

## Notes

- **Debug builds ignore `getJSBundleFile()`.** You must use `npx expo run:android --variant release` for OTA to actually work. The demo's first build via `npx expo run:android` defaults to debug — change to release after first install.
- **Hermes vs JSC.** If your APK uses Hermes (the default in Expo), `expo export:embed` produces a Hermes-compiled bundle. Keep `--platform android` consistent with what your APK was built with.
- **Asset zips.** This demo doesn't ship an assets zip. If your app has new icons/images, you'd need to include them. Use the `--assets` flag in `pushdeck deploy` to upload one.

## Troubleshooting

**"You're on the latest version" even after deploy**
The SDK only sees updates when the local stored version is OLDER than the promoted one. If you promote v1.0.0 from a clean install, the SDK sees both as 1.0.0. Either bump the version OR clear app storage.

**"Download & restart" downloads but no visible change**
Check that you used `--dev false` when bundling. Dev bundles include source maps + dev mode flags — the override might not load them correctly.

**MainApplication.kt has no override**
Did you run `expo prebuild` and apply the 6-line edit? Without it, the SDK downloads the bundle but Android never loads it.

**App crashes on the OTA bundle**
You probably bumped a native dependency. Native code changes need a new APK. Set `minNativeVersion` in `pushdeck deploy` to match your APK version.
