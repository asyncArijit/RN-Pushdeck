export function compareSemver(a: string, b: string): number {
  const parse = (v: string | undefined | null): number[] =>
    String(v ?? '0')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
