/**
 * Usernames are stored lowercase. The UI shows a fixed "@" prefix, so a
 * leading "@" typed by the user is dropped instead of becoming part of the
 * name.
 */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

/** class-transformer hook: normalizes strings, leaves anything else for the validators. */
export function toNormalizedUsername({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? normalizeUsername(value) : value;
}
