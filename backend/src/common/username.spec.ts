import { normalizeUsername, toNormalizedUsername } from './username';

describe('normalizeUsername', () => {
  it('lowercases the username', () => {
    expect(normalizeUsername('JuanDev')).toBe('juandev');
  });

  it('drops a leading @ and surrounding spaces', () => {
    expect(normalizeUsername('  @@Loren ')).toBe('loren');
  });

  it('keeps an @ that is not leading', () => {
    expect(normalizeUsername('a@b')).toBe('a@b');
  });

  it('passes non-strings through for the validators to reject', () => {
    expect(toNormalizedUsername({ value: 42 })).toBe(42);
    expect(toNormalizedUsername({ value: undefined })).toBeUndefined();
    expect(toNormalizedUsername({ value: '@Ana' })).toBe('ana');
  });
});
