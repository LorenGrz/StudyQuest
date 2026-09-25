import { CAREERS } from './careers';
import { CAREER_CATALOG } from '../database/seeds/data/subjects-catalog';

describe('CAREERS', () => {
  it('has no duplicates', () => {
    expect(new Set(CAREERS).size).toBe(CAREERS.length);
  });

  it('contains every career used in the seed catalog', () => {
    const allowed = new Set<string>(CAREERS);
    const missing = [
      ...new Set(CAREER_CATALOG.map((row) => row.career)),
    ].filter((career) => !allowed.has(career));

    expect(missing).toEqual([]);
  });

  it('includes the core seed career', () => {
    // seed.ts CAREER const + all seeded users
    expect(CAREERS).toContain('Ingeniería en Sistemas de Información');
  });
});
