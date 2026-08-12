# @asyncarijit/rn-pushdeck

[![npm](https://img.shields.io/npm/v/@asyncarijit/rn-pushdeck.svg)](https://www.npmjs.com/package/@asyncarijit/rn-pushdeck)
[![license](https://img.shields.io/npm/l/@asyncarijit/rn-pushdeck.svg)](./LICENSE)

Over-the-air JavaScript updates for React Native — a self-hosted alternative to Microsoft CodePush.

## Install

```bash
npm install @asyncarijit/rn-pushdeck \
  react-native-fs \
  react-native-restart \
  @react-native-async-storage/async-storage \
  react-native-device-info
```

Optional (only if you also ship asset zips):

```bash
npm install react-native-zip-archive
```

After installing native deps, rebuild your Android app:

```bash
cd android && ./gradlew clean && cd .. && npx expo run:android
```

## Set up Android (one-time)

You need to tell React Native to load JS bundles from your app's `filesDir` if a downloaded one exists. See [`INSTALL_ANDROID.md`](./INSTALL_ANDROID.md) for the exact Kotlin override.

iOS support is coming in a later release.

## Configure

In your app's entry file (`App.tsx` or `index.js`):

```ts
import { configure, checkForUpdate } from '@asyncarijit/rn-pushdeck';

configure({
  projectKey: 'psh_xxxxxxxxxx',  // get this from the rn-pushdeck dashboard
  channel: 'production',          // optional, default 'production'
});
```

## Check for updates

```ts
import { useEffect } from 'react';
import { checkForUpdate } from '@asyncarijit/rn-pushdeck';

export default function App() {
  useEffect(() => {
    checkForUpdate();
  }, []);
  // ...
}
```

Default behaviour: if a newer bundle is available on your project's channel, the user sees a native dialog asking whether to update. On confirm, the bundle downloads, is saved to local storage, and the app restarts.

## Customize the prompt

```ts
import { configure } from '@asyncarijit/rn-pushdeck';

configure({
  projectKey: 'psh_xxx',
  onUpdateAvailable: ({ version, force, releaseNotes, apply }) => {
    // Show your own UI here. Call apply() when the user accepts.
    setUpdateBanner({ version, force, releaseNotes, onAccept: apply });
  },
  onError: (err) => {
    console.warn('OTA error:', err);
  },
});
```

`apply()` does the actual download + restart. It returns a `Promise` so you can show a progress indicator while it runs.

## API

```ts
configure(options: ConfigOptions): void
checkForUpdate(): Promise<void>
restart(): void
compareSemver(a: string, b: string): number

type ConfigOptions = {
  projectKey: string;
  channel?: string;                          // default 'production'
  apiUrl?: string;                           // default rn-pushdeck production
  autoRestart?: boolean;                     // default false
  onUpdateAvailable?: (ctx: UpdateContext) => void;
  onError?: (err: unknown) => void;
};

type UpdateContext = {
  version: string;
  releaseNotes: string | null;
  force: boolean;
  bundleSize: number;
  apply: () => Promise<void>;
};
```

## How it works

1. On app launch, `checkForUpdate()` hits the rn-pushdeck **manifest endpoint** with your `projectKey` and `channel`.
2. The endpoint returns the current bundle URL and version for that channel.
3. The SDK compares the remote version against the locally stored one (or the native APK version if none stored).
4. If newer, the SDK calls your `onUpdateAvailable` handler (or shows a default Alert).
5. When the handler calls `apply()`, the SDK downloads the bundle directly from Cloudflare R2 (no API roundtrip), saves it to `filesDir/index.android.bundle`, and triggers a restart.
6. On next launch, the native override in `MainApplication.kt` loads the downloaded bundle instead of the APK-bundled one.

## When OTA is safe

✅ **Safe to ship via OTA:**
- Pure JavaScript / TypeScript changes
- UI tweaks, business logic, copy
- New screens, API call changes

❌ **NOT safe (requires a new APK):**
- Adding a new native module (e.g., camera)
- Bumping a library that has native code
- Changing AndroidManifest.xml permissions

Use `minNativeVersion` (set when uploading via `pushdeck deploy --min-native 1.0.0`) to prevent serving a JS bundle to APKs that don't have the required native code.
