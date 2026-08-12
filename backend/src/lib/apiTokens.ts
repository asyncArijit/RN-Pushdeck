const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_PREFIX = 'pdkt_';
const RANDOM_LEN = 32;

export function generateRawToken(): string {
  const bytes = new Uint8Array(RANDOM_LEN);
  crypto.getRandomValues(bytes);
  let out = TOKEN_PREFIX;
  for (let i = 0; i < RANDOM_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function tokenPrefixOf(rawToken: string): string {
  return rawToken.slice(0, TOKEN_PREFIX.length + 6) + '…';
}

export async function hashToken(rawToken: string): Promise<string> {
  const buf = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function looksLikeApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}
