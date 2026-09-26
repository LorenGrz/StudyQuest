/**
 * Mirrors the backend rule (backend/src/common/username.ts): usernames are
 * lowercase and the "@" is a fixed prefix in the UI, never part of the value.
 * Spaces are removed as the user types.
 */
export function normalizeUsernameInput(value: string): string {
  return value.replace(/\s+/g, '').replace(/^@+/, '').toLowerCase()
}
