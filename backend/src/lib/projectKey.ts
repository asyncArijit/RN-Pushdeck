const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789';
const KEY_PREFIX = 'psh_';
const RANDOM_LEN = 14;

export function generateProjectKey(): string {
  const bytes = new Uint8Array(RANDOM_LEN);
  crypto.getRandomValues(bytes);
  let out = KEY_PREFIX;
  for (let i = 0; i < RANDOM_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
