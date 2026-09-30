import { normalizeSubjectName } from '../../common/subject-name';
import type { OfficialSubjectRow } from '../seeds/data/official-subjects';
import { DbSubjectRow, planSeedOfficial } from './seed-official-subjects.plan';

const UNI = 'Universidad de Buenos Aires';
const universities = [{ id: 'u1', name: UNI }];
const careers = [
  {
    id: 'c1',
    universityId: 'u1',
    nameNormalized: normalizeSubjectName('Carrera A'),
  },
  {
    id: 'c2',
    universityId: 'u1',
    nameNormalized: normalizeSubjectName('Carrera B'),
  },
];

const row = (
  name: string,
  extra: Partial<OfficialSubjectRow> = {},
): OfficialSubjectRow => ({
  university: UNI,
  career: 'Carrera A',
  name,
  code: null,
  year: 1,
  ...extra,
});

const existing = (
  id: string,
  name: string,
  extra: Partial<DbSubjectRow> = {},
): DbSubjectRow => ({
  id,
  universityId: 'u1',
  university: UNI,
  nameNormalized: normalizeSubjectName(name),
  name,
  code: null,
  year: 1,
  careerId: 'c1',
  description: null,
  source: 'official',
  status: 'active',
  visibility: 'university',
  ...extra,
});

describe('planSeedOfficial', () => {
  it('stores a subject shared by two careers once, tagged with the first, lowest year', () => {
    const plan = planSeedOfficial(
      [
        row('Análisis Matemático I', { year: 2 }),
        row('Analisis Matematico 1', { career: 'Carrera B', year: 1 }),
      ],
      universities,
      careers,
      [],
    );
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0]).toMatchObject({
      name: 'Análisis Matemático I',
      careerId: 'c1',
      year: 1,
    });
  });

  it('is idempotent against its own output', () => {
    const plan = planSeedOfficial(
      [row('Programación I', { code: 'P1' })],
      universities,
      careers,
      [existing('s1', 'Programación I', { code: 'P1' })],
    );
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it('never touches an active legacy subject with the same name', () => {
    const plan = planSeedOfficial([row('Álgebra I')], universities, careers, [
      existing('s1', 'Algebra I', { source: 'legacy', code: 'ALG' }),
    ]);
    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.keptLegacy).toEqual([
      { id: 's1', name: 'Algebra I', university: UNI },
    ]);
  });

  it('promotes hidden legacy and community rows to official', () => {
    const plan = planSeedOfficial(
      [row('Álgebra I'), row('Física I')],
      universities,
      careers,
      [
        existing('s1', 'Álgebra I', { source: 'legacy', status: 'hidden' }),
        existing('s2', 'Física I', {
          source: 'community',
          visibility: 'private',
        }),
      ],
    );
    expect(plan.updates.map((u) => [u.id, u.promotedFrom])).toEqual([
      ['s1', 'legacy/hidden'],
      ['s2', 'community/active'],
    ]);
  });

  it('updates changed data of official rows but not a merged duplicate', () => {
    const plan = planSeedOfficial(
      [row('Física I', { year: 2 })],
      universities,
      careers,
      [
        existing('s0', 'Física I', { status: 'merged', source: 'legacy' }),
        existing('s1', 'Física I', { status: 'hidden' }),
      ],
    );
    expect(plan.updates).toEqual([
      expect.objectContaining({
        id: 's1',
        changes: ['year'],
        promotedFrom: null,
      }),
    ]);
  });

  it('drops a code already used by another subject of the same university', () => {
    const plan = planSeedOfficial(
      [row('Química', { code: 'Q1' })],
      universities,
      careers,
      [existing('s1', 'Otra Materia', { source: 'legacy', code: 'Q1' })],
    );
    expect(plan.inserts[0].code).toBeNull();
    expect(plan.warnings).toHaveLength(1);
  });

  it('lets a code move between two rewritten rows in a single run', () => {
    // s1 (hidden legacy "Física I") holds Q2, which the catalog assigns to
    // "Química"; s1 itself becomes "Física I" with Q1.
    const plan = planSeedOfficial(
      [row('Física I', { code: 'Q1' }), row('Química', { code: 'Q2' })],
      universities,
      careers,
      [
        existing('s1', 'Física I', {
          source: 'legacy',
          status: 'hidden',
          code: 'Q2',
        }),
      ],
    );
    expect(plan.warnings).toEqual([]);
    expect(plan.updates[0]).toMatchObject({ id: 's1', changes: ['code'] });
    expect(plan.inserts[0]).toMatchObject({ name: 'Química', code: 'Q2' });
  });

  it('reports missing universities and careers as errors', () => {
    const plan = planSeedOfficial(
      [
        row('X', { university: 'Universidad Z' }),
        row('Y', { career: 'Carrera Z' }),
      ],
      universities,
      careers,
      [],
    );
    expect(plan.errors).toHaveLength(2);
    expect(plan.inserts).toHaveLength(0);
  });
});
