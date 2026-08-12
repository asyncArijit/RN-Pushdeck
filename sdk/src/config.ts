import type { ConfigOptions, ResolvedConfig } from './types';

const DEFAULT_API_URL = 'https://rn-pushdeck-api.asyncarijit.workers.dev';

let resolved: ResolvedConfig | null = null;

export function configure(options: ConfigOptions): void {
  if (!options.projectKey) {
    throw new Error('[rn-pushdeck] projectKey is required.');
  }
  resolved = {
    projectKey: options.projectKey,
    channel: options.channel ?? 'production',
    apiUrl: (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, ''),
    autoRestart: options.autoRestart ?? true,
    onUpdateAvailable: options.onUpdateAvailable,
    onError: options.onError,
  };
}

export function getConfig(): ResolvedConfig {
  if (!resolved) {
    throw new Error(
      '[rn-pushdeck] Not configured. Call configure({ projectKey: "..." }) before checkForUpdate().'
    );
  }
  return resolved;
}
