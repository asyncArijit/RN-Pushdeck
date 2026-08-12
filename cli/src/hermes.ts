import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const HERMES_MAGIC = '\xc6\x1f\xbc\x03';

function findHermesc(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidates = [
      join(dir, 'node_modules', 'react-native', 'sdks', 'hermesc', 'win64-bin', 'hermesc.exe'),
      join(dir, 'node_modules', 'react-native', 'sdks', 'hermesc', 'osx-bin', 'hermesc'),
      join(dir, 'node_modules', 'react-native', 'sdks', 'hermesc', 'linux64-bin', 'hermesc'),
    ];
    for (const c of candidates) if (existsSync(c)) return c;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isHermesBytecode(filePath: string): boolean {
  try {
    const fd = readFileSync(filePath).subarray(0, 4).toString('binary');
    return fd === HERMES_MAGIC;
  } catch {
    return false;
  }
}

function projectUsesHermes(bundleDir: string): boolean {
  let dir = bundleDir;
  for (let i = 0; i < 6; i++) {
    const appJson = join(dir, 'app.json');
    if (existsSync(appJson)) {
      try {
        const json = JSON.parse(readFileSync(appJson, 'utf8'));
        const explicit = json?.expo?.jsEngine ?? json?.jsEngine;
        if (explicit === 'jsc') return false;
        return true;
      } catch {
        return true;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return true;
}

export type CompileResult =
  | { kind: 'already-bytecode'; path: string }
  | { kind: 'compiled'; path: string; originalPath: string }
  | { kind: 'skipped-no-hermes'; path: string }
  | { kind: 'skipped-jsc-project'; path: string };

export function compileBundleIfNeeded(bundlePath: string): CompileResult {
  const absBundle = resolve(bundlePath);
  if (!existsSync(absBundle)) {
    throw new Error(`Bundle file not found: ${absBundle}`);
  }

  if (isHermesBytecode(absBundle)) {
    return { kind: 'already-bytecode', path: absBundle };
  }

  const bundleDir = dirname(absBundle);

  if (!projectUsesHermes(bundleDir)) {
    return { kind: 'skipped-jsc-project', path: absBundle };
  }

  const hermesc = findHermesc(bundleDir);
  if (!hermesc) {
    return { kind: 'skipped-no-hermes', path: absBundle };
  }

  const outPath = absBundle.endsWith('.js')
    ? absBundle.replace(/\.js$/, '.hbc')
    : absBundle + '.hbc';

  const res = spawnSync(hermesc, ['-emit-binary', '-out', outPath, absBundle], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    // Default maxBuffer (1MB) kills hermesc when bundles emit many warnings.
    // Raise to 50MB so the child process can finish writing the bytecode file.
    maxBuffer: 50 * 1024 * 1024,
  });

  // hermesc exits non-zero on warnings too. Verify the output is real Hermes bytecode
  // rather than relying on exit code.
  if (!existsSync(outPath) || !isHermesBytecode(outPath)) {
    const stderr = res.stderr?.slice(0, 400) ?? '';
    const stdout = res.stdout?.slice(0, 400) ?? '';
    throw new Error(`hermesc failed: ${stderr || stdout || 'no output file produced'}`);
  }

  return { kind: 'compiled', path: outPath, originalPath: absBundle };
}

export function cleanupCompiled(result: CompileResult): void {
  if (result.kind === 'compiled' && existsSync(result.path)) {
    try {
      unlinkSync(result.path);
    } catch {}
  }
}
