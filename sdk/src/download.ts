import RNFS from 'react-native-fs';

const LOCAL_BUNDLE_PATH = `${RNFS.DocumentDirectoryPath}/index.android.bundle`;
const LOCAL_ASSETS_ZIP = `${RNFS.DocumentDirectoryPath}/rn-pushdeck-assets.zip`;
const ASSETS_TARGET = `${RNFS.DocumentDirectoryPath}/rn-pushdeck-assets`;

const RN_ASSET_FOLDERS = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
  'raw',
];

export async function downloadBundle(bundleUrl: string): Promise<void> {
  const tmpPath = `${LOCAL_BUNDLE_PATH}.tmp`;

  const result = await RNFS.downloadFile({
    fromUrl: bundleUrl,
    toFile: tmpPath,
    background: true,
    discretionary: true,
  }).promise;

  if (result.statusCode !== 200) {
    if (await RNFS.exists(tmpPath)) {
      await RNFS.unlink(tmpPath).catch(() => undefined);
    }
    throw new Error(`Bundle download failed: ${result.statusCode}`);
  }

  if (await RNFS.exists(LOCAL_BUNDLE_PATH)) {
    await RNFS.unlink(LOCAL_BUNDLE_PATH);
  }
  await RNFS.moveFile(tmpPath, LOCAL_BUNDLE_PATH);
}

type UnzipFn = (src: string, dst: string) => Promise<string>;

export async function downloadAndUnzipAssets(assetsUrl: string): Promise<void> {
  let unzipFn: UnzipFn | null = null;
  try {
    // Optional peer dep — only required if you ship assets zips.
    // @ts-expect-error optional peer dependency, may not be installed
    const mod = (await import('react-native-zip-archive')) as { unzip: UnzipFn };
    unzipFn = mod.unzip;
  } catch {
    return;
  }
  if (!unzipFn) return;

  const result = await RNFS.downloadFile({
    fromUrl: assetsUrl,
    toFile: LOCAL_ASSETS_ZIP,
  }).promise;
  if (result.statusCode !== 200) {
    throw new Error(`Assets download failed: ${result.statusCode}`);
  }

  if (await RNFS.exists(ASSETS_TARGET)) {
    await RNFS.unlink(ASSETS_TARGET).catch(() => undefined);
  }
  await RNFS.mkdir(ASSETS_TARGET);
  await unzipFn(LOCAL_ASSETS_ZIP, ASSETS_TARGET);

  for (const folder of RN_ASSET_FOLDERS) {
    const src = `${ASSETS_TARGET}/${folder}`;
    const dst = `${RNFS.DocumentDirectoryPath}/${folder}`;
    if (!(await RNFS.exists(src))) continue;
    if (await RNFS.exists(dst)) {
      await RNFS.unlink(dst).catch(() => undefined);
    }
    await RNFS.moveFile(src, dst);
  }

  await RNFS.unlink(LOCAL_ASSETS_ZIP).catch(() => undefined);
}

export function localBundlePath(): string {
  return LOCAL_BUNDLE_PATH;
}
