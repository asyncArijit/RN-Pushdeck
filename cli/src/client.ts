import { loadConfig, defaultApiUrl, envToken } from './config.js';
import type { ApiClient } from './api.js';

export function resolveClient(): ApiClient | null {
  const envT = envToken();
  if (envT) {
    return { apiUrl: defaultApiUrl(), token: envT };
  }
  const config = loadConfig();
  if (config) return config;
  return null;
}
