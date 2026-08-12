const UNIQUE_VIOLATION = '23505';

type PgErrorLike = { code?: string; constraint?: string };

function unwrap(err: unknown): PgErrorLike | undefined {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    const e = current as PgErrorLike & { cause?: unknown };
    if (typeof e.code === 'string') return e;
    current = e.cause;
  }
  return undefined;
}

export function isUniqueViolation(err: unknown, constraintName?: string): boolean {
  const pg = unwrap(err);
  if (!pg) return false;
  if (pg.code !== UNIQUE_VIOLATION) return false;
  if (constraintName && pg.constraint !== constraintName) return false;
  return true;
}
