import pc from 'picocolors';

export function info(msg: string): void {
  console.log(pc.cyan('•') + ' ' + msg);
}

export function success(msg: string): void {
  console.log(pc.green('✓') + ' ' + msg);
}

export function warn(msg: string): void {
  console.log(pc.yellow('!') + ' ' + msg);
}

export function fail(msg: string): void {
  console.error(pc.red('✗') + ' ' + msg);
}

export function step(msg: string): void {
  process.stdout.write(pc.dim('  ' + msg + '... '));
}

export function stepDone(extra?: string): void {
  console.log(pc.green('done') + (extra ? pc.dim(' ' + extra) : ''));
}

export function stepFail(): void {
  console.log(pc.red('failed'));
}

export function bold(msg: string): string {
  return pc.bold(msg);
}

export function dim(msg: string): string {
  return pc.dim(msg);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
