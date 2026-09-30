import { normalizeSubjectName } from './subject-name';

/** Canonical catalog name that legacy "UTN" strings are unified into. */
export const UTN_CANONICAL = 'Universidad Tecnológica Nacional – FRBA';

/** Legacy spellings that must resolve to another catalog university. */
const ALIASES = new Map<string, string>([
  [
    normalizeSubjectName('Universidad Tecnológica Nacional'),
    normalizeSubjectName(UTN_CANONICAL),
  ],
]);

/**
 * Match key for a university name: normalizeSubjectName plus the legacy
 * aliases. Used by the backfill, the user mapping and every place that turns
 * a legacy `university` string (query params, old frontend) into an id.
 */
export function universityKey(name: string | null | undefined): string {
  const key = normalizeSubjectName(name ?? '');
  return ALIASES.get(key) ?? key;
}
