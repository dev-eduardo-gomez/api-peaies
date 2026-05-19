import { createHash } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Produces a stable SHA-256 from any JSON-serializable object.
// Keys are sorted so { a, b } and { b, a } yield the same hash.
export function hashObject(obj: Record<string, unknown>): string {
  return sha256(stableStringify(obj));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
    );
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(value);
}
