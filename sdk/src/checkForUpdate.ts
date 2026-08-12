import DeviceInfo from 'react-native-device-info';
import RNRestart from 'react-native-restart';
import { Alert } from 'react-native';
import { getConfig } from './config';
import { fetchManifest } from './manifest';
import { downloadBundle, downloadAndUnzipAssets } from './download';
import { getLocalVersion, setLocalVersion } from './storage';
import { compareSemver } from './semver';
import type { UpdateContext } from './types';

export async function checkForUpdate(): Promise<void> {
  const config = getConfig();

  try {
    const manifest = await fetchManifest();
    if (!manifest.version) return;

    const nativeVersion = DeviceInfo.getVersion();
    if (
      manifest.minNativeVersion &&
      compareSemver(nativeVersion, manifest.minNativeVersion) < 0
    ) {
      return;
    }

    const localVersion = (await getLocalVersion()) ?? nativeVersion;
    if (compareSemver(localVersion, manifest.version) >= 0) return;

    const bundleUrl = manifest.bundleUrl;
    if (!bundleUrl) return;

    const ctx: UpdateContext = {
      version: manifest.version,
      releaseNotes: manifest.releaseNotes ?? null,
      force: manifest.force === true,
      bundleSize: manifest.size ?? 0,
      apply: async () => {
        await downloadBundle(bundleUrl);
        if (manifest.assetsUrl) {
          try {
            await downloadAndUnzipAssets(manifest.assetsUrl);
          } catch (err) {
            config.onError?.(err);
          }
        }
        await setLocalVersion(manifest.version!);
        if (config.autoRestart) RNRestart.Restart();
      },
    };

    if (config.onUpdateAvailable) {
      config.onUpdateAvailable(ctx);
      return;
    }

    Alert.alert(
      ctx.force ? 'Update Required' : 'Update Available',
      `Version ${ctx.version} is ready to install.${
        ctx.releaseNotes ? `\n\n${ctx.releaseNotes}` : ''
      }`,
      ctx.force
        ? [
            {
              text: 'Update',
              onPress: () => {
                void ctx.apply();
              },
            },
          ]
        : [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update',
              onPress: () => {
                void ctx.apply();
              },
            },
          ],
      { cancelable: !ctx.force }
    );
  } catch (err) {
    config.onError?.(err);
  }
}

export function restart(): void {
  RNRestart.Restart();
}
