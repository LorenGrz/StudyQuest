import { mapUsersToCatalog, SqlRunner } from './map-users-to-catalog';

/** Fake runner: answers the SELECTs in order and records the UPDATEs. */
function fakeRunner(selects: unknown[][]) {
  const updates: { sql: string; params: unknown[] }[] = [];
  const queue = [...selects];
  const db: SqlRunner = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      if (/^\s*UPDATE/i.test(sql)) {
        updates.push({ sql, params: params ?? [] });
        return [];
      }
      return queue.shift() ?? [];
    }),
  };
  return { db, updates };
}

const UTN = { id: 'uni-utn', name: 'Universidad Tecnológica Nacional – FRBA' };
const UBA = { id: 'uni-uba', name: 'Universidad de Buenos Aires' };
const UNSAM = {
  id: 'uni-unsam',
  name: 'Universidad Nacional de San Martín',
  short_name: 'UNSAM',
};

describe('mapUsersToCatalog', () => {
  it('maps by normalized name (UTN alias included) and leaves free text unmapped', async () => {
    const { db, updates } = fakeRunner([
      [UBA, UTN],
      [
        { id: 'u1', university: '  universidad de BUENOS aires ' },
        { id: 'u2', university: 'Universidad Tecnológica Nacional' },
        { id: 'u3', university: 'Mi Uni Inventada' },
      ],
      [
        {
          id: 'car-cc',
          university_id: UBA.id,
          name_normalized: 'ciencias de la computacion',
        },
      ],
      [
        {
          id: 'u1',
          university_id: UBA.id,
          career: 'Ciencias de la Computación',
        },
        { id: 'u2', university_id: UTN.id, career: 'Carrera Inexistente' },
      ],
    ]);

    const result = await mapUsersToCatalog(db);

    expect(result).toEqual({ universitiesMapped: 2, careersMapped: 1 });
    expect(updates[0].params).toEqual([
      ['u1', 'u2'],
      [UBA.id, UTN.id],
    ]);
    expect(updates[0].sql).toMatch(/u\.university_id IS NULL/);
    expect(updates[1].params).toEqual([['u1'], ['car-cc']]);
    expect(updates[1].sql).toMatch(/u\.career_id IS NULL/);
  });

  it('also maps an acronym to the university with that short name', async () => {
    const { db, updates } = fakeRunner([
      [UBA, UNSAM],
      [{ id: 'u1', university: 'Unsam' }],
      [],
      [],
    ]);
    await expect(mapUsersToCatalog(db)).resolves.toEqual({
      universitiesMapped: 1,
      careersMapped: 0,
    });
    expect(updates[0].params).toEqual([['u1'], [UNSAM.id]]);
  });

  it('issues no UPDATE when there is nothing to map', async () => {
    const { db, updates } = fakeRunner([[UBA], [], [], []]);
    await expect(mapUsersToCatalog(db)).resolves.toEqual({
      universitiesMapped: 0,
      careersMapped: 0,
    });
    expect(updates).toHaveLength(0);
  });
});
