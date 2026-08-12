import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

export function detectAndroidVersionName(startDir: string): string | null {
  let dir = resolve(startDir);
  for (let i = 0; i < 6; i++) {
    const gradle = join(dir, 'android', 'app', 'build.gradle');
    if (existsSync(gradle)) {
      try {
        const content = readFileSync(gradle, 'utf8');
        const match = content.match(/versionName\s+["']([^"']+)["']/);
        if (match) return match[1];
      } catch {}
      return null;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
