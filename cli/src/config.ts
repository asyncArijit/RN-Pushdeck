import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const CONFIG_DIR = join(homedir(), '.pushdeck');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
const DEFAULT_API_URL = 'https://rn-pushdeck-api.asyncarijit.workers.dev';

export type CliConfig = {
  apiUrl: string;
  token: string;
};

export function loadConfig(): CliConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.token !== 'string') return null;
    return {
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : DEFAULT_API_URL,
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  if (process.platform !== 'win32') {
    try {
      chmodSync(CONFIG_PATH, 0o600);
    } catch {}
  }
}

export function deleteConfig(): boolean {
  if (!existsSync(CONFIG_PATH)) return false;
  unlinkSync(CONFIG_PATH);
  return true;
}

export function configPath(): string {
  return CONFIG_PATH;
}

export function defaultApiUrl(): string {
  return process.env.PUSHDECK_API_URL ?? DEFAULT_API_URL;
}

export function envToken(): string | undefined {
  return process.env.PUSHDECK_TOKEN;
}
