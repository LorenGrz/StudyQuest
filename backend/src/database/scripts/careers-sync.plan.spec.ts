import {
  CatalogFile,
  DbCareer,
  DbUniversity,
  countChanges,
  planCareersSync,
} from './careers-sync.plan';
import { normalizeSubjectName } from '../../common/subject-name';

const file = (
  name: string,
  careers: [string, 'grado' | 'pregrado'][],
): { file: string; data: CatalogFile } => ({
  file: 'x.json',
  data: {
    university: {
      name,
      shortName: 'X',
      website: 'https://x.edu.ar',
      careersSourceUrls: ['https://x.edu.ar/carreras'],
    },
    careers: careers.map(([n, level]) => ({
      name: n,
      faculty: 'Facultad X',
      level,
      sourceUrl: 'https://x.edu.ar/c',
    })),
  },
});

const dbUni = (id: string, name: string): DbUniversity => ({
  id,
  name,
  shortName: 'X',
  website: 'https://x.edu.ar',
  careersSourceUrls: ['https://x.edu.ar/carreras'],
});

const dbCareer = (
  id: string,
  universityId: string,
  name: string,
  extra: Partial<DbCareer> = {},
): DbCareer => ({
  id,
  universityId,
  name,
  nameNormalized: normalizeSubjectName(name),
  faculty: 'Facultad X',
  level: 'grado',
  sourceUrl: 'https://x.edu.ar/c',
  status: 'active',
  approvedByAdmin: false,
  ...extra,
});

describe('planCareersSync', () => {
  it('inserts a new university with all its careers', () => {
    const plan = planCareersSync(
      [file('Universidad Nueva', [['Licenciatura en Algo', 'grado']])],
      [],
      [],
    );
    expect(plan.universities[0].universityId).toBeNull();
    expect(plan.universities[0].inserts.map((c) => c.name)).toEqual([
      'Licenciatura en Algo',
    ]);
  });

  it('matches existing rows by normalized name and reports no changes when equal', () => {
    const plan = planCareersSync(
      [file('Universidad X', [['Ingeniería en Informática', 'grado']])],
      [dbUni('u1', 'Universidad X')],
      [
        dbCareer('c1', 'u1', 'ingenieria en informatica', {
          name: 'Ingeniería en Informática',
        }),
      ],
    );
    expect(countChanges(plan)).toBe(0);
  });

  it('updates changed fields, reactivates retired careers and fills legacy gaps', () => {
    const plan = planCareersSync(
      [file('Universidad X', [['Analista 1', 'pregrado']])],
      [dbUni('u1', 'Universidad X')],
      [
        dbCareer('c1', 'u1', 'Analista I', {
          status: 'retired',
          faculty: null,
          sourceUrl: null,
        }),
      ],
    );
    const [u] = plan.universities;
    expect(u.inserts).toHaveLength(0);
    expect(u.updates[0].id).toBe('c1');
    expect(u.updates[0].changes).toEqual(
      expect.arrayContaining([
        'name',
        'faculty',
        'level',
        'sourceUrl',
        'status',
      ]),
    );
  });

  it('retires careers missing from the file but keeps admin-approved ones', () => {
    const plan = planCareersSync(
      [file('Universidad X', [['Abogacía', 'grado']])],
      [dbUni('u1', 'Universidad X')],
      [
        dbCareer('c1', 'u1', 'Abogacía'),
        dbCareer('c2', 'u1', 'Informática'),
        dbCareer('c3', 'u1', 'Carrera Aprobada', { approvedByAdmin: true }),
        dbCareer('c4', 'u1', 'Ya Retirada', { status: 'retired' }),
      ],
    );
    expect(plan.universities[0].retires).toEqual([
      { id: 'c2', name: 'Informática' },
    ]);
  });

  it('resolves the legacy UTN name to the FRBA catalog university', () => {
    const plan = planCareersSync(
      [file('Universidad Tecnológica Nacional – FRBA', [])],
      [dbUni('u1', 'Universidad Tecnológica Nacional')],
      [],
    );
    expect(plan.universities[0].universityId).toBe('u1');
    expect(plan.universities[0].universityChanges).toEqual(['name']);
  });

  it('lists DB universities without a catalog file and ignores repeated careers', () => {
    const plan = planCareersSync(
      [
        file('Universidad X', [
          ['Medicina', 'grado'],
          ['MEDICINA', 'grado'],
        ]),
      ],
      [dbUni('u1', 'Universidad X'), dbUni('u2', 'Mi Uni')],
      [],
    );
    expect(plan.uncovered).toEqual(['Mi Uni']);
    expect(plan.universities[0].inserts).toHaveLength(1);
    expect(plan.warnings).toHaveLength(1);
  });
});
