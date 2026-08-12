# Android setup

You need to override one method in your app's `MainApplication.kt` so React Native loads the downloaded bundle (if any) instead of the one baked into the APK.

## Where the file is

```
your-rn-app/
└── android/
    └── app/
        └── src/
            └── main/
                └── java/
                    └── com/<your_pkg>/<your_app>/
                        └── MainApplication.kt
```

## What to change

Find this part of the class (it looks roughly like this in a fresh project):

```kotlin
override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> = PackageList(this).packages

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    }
)
```

Add an override for `getJSBundleFile()` and an `import java.io.File` at the top:

```kotlin
import java.io.File

// ... inside the object : DefaultReactNativeHost(this) { } block:

override fun getJSBundleFile(): String? {
  val bundlePath = applicationContext.filesDir.absolutePath + "/index.android.bundle"
  val bundleFile = File(bundlePath)
  return if (bundleFile.exists()) {
    bundlePath
  } else {
    super.getJSBundleFile()
  }
}
```

## Full example

```kotlin
package com.yourorg.yourapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import expo.modules.ReactNativeHostWrapper
import java.io.File

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> = PackageList(this).packages
        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

        override fun getJSBundleFile(): String? {
          val bundlePath = applicationContext.filesDir.absolutePath + "/index.android.bundle"
          val bundleFile = File(bundlePath)
          return if (bundleFile.exists()) {
            bundlePath
          } else {
            super.getJSBundleFile()
          }
        }
      }
  )
  // ... rest of your existing file unchanged
}
```

## How to verify it works

1. Rebuild your APK and install it on a device
2. Push an OTA update via the dashboard or `pushdeck deploy`
3. Open the app — the SDK detects the new version and prompts (or your custom UI fires)
4. Accept — bundle downloads to `filesDir/index.android.bundle`
5. App restarts → `getJSBundleFile()` returns the downloaded path → new code runs
6. Make a visible change in the next deploy — confirm you see it after another OTA

## Caveats

- **First install**: the file doesn't exist yet, so `super.getJSBundleFile()` returns null, which makes React Native fall back to the asset baked into the APK. That's the correct behaviour.
- **Debug builds**: when `BuildConfig.DEBUG` is true, RN ignores `getJSBundleFile()` and uses Metro. OTA only works in release builds.
- **Hermes engine**: the downloaded `index.android.bundle` must be Hermes-compiled if your app uses Hermes. The CLI doesn't do this for you — your build pipeline does.

## iOS

iOS support requires a similar override in `AppDelegate.swift` (`sourceURL(for:)`). Not yet shipped — coming in a future SDK release.
