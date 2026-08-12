export type Manifest = {
  version: string | null;
  minNativeVersion?: string;
  force?: boolean;
  bundleUrl?: string;
  assetsUrl?: string;
  size?: number;
  assetsSize?: number;
  releaseNotes?: string | null;
};

export type UpdateContext = {
  version: string;
  releaseNotes: string | null;
  force: boolean;
  bundleSize: number;
  apply: () => Promise<void>;
};

export type ConfigOptions = {
  projectKey: string;
  channel?: string;
  apiUrl?: string;
  autoRestart?: boolean;
  onUpdateAvailable?: (ctx: UpdateContext) => void;
  onError?: (err: unknown) => void;
};

export type ResolvedConfig = Required<
  Omit<ConfigOptions, 'onUpdateAvailable' | 'onError'>
> & {
  onUpdateAvailable?: (ctx: UpdateContext) => void;
  onError?: (err: unknown) => void;
};
