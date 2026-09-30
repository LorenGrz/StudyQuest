/**
 * Validador de `official-subjects.ts` (tarea C2). Corre standalone con
 * `pnpm subjects:validate-official`. Reglas:
 *
 * - `name` no vacío.
 * - `year` entre 1 y 6.
 * - Sin duplicados de `(university, career, name_normalizado)`.
 * - Sin `code` duplicado dentro de una universidad, salvo que el nombre
 *   normalizado coincida (la misma materia compartida entre carreras es
 *   esperable y se reporta como "cross-career share", no como error).
 * - Solo para UNSAM: ningún nombre termina en un dígito arábigo 1-10
 *   (detecta un "Programación 1" sin corregir a numeral romano — el resto de
 *   universidades escribe algunas materias con arábigo en su plan oficial
 *   real, ver `official-subjects.ts`, así que esa regla no aplica ahí).
 * - Cada (university, career) existe en `careers/*.json`.
 * - Sin cupos genéricos ("Electiva I", "Optativa 2", "Materia Electiva del
 *   Ciclo Superior III"…): no son materias reales y nadie arma quests para
 *   ellas. Las electivas con nombre propio sí entran.
 *
 * Imprime conteos por universidad y por carrera.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { normalizeSubjectName } from '../../../common/subject-name';
import { OFFICIAL_SUBJECTS, OfficialSubjectRow } from './official-subjects';

const UNSAM = 'Universidad Nacional de San Martín';

/** `universidad|||carrera` de todos los `careers/*.json` (catálogo C1). */
function loadCatalogCareers(): Set<string> {
  const dir = join(__dirname, 'careers');
  const keys = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
      university: { name: string };
      careers: { name: string }[];
    };
    for (const c of data.careers)
      keys.add(`${data.university.name}|||${c.name}`);
  }
  return keys;
}

/** Cupos de electiva/optativa sin contenido propio en el plan. */
const PLACEHOLDER_NAME =
  /^(?:(?:Asignatura|Materia) )?(?:Electiva|Optativa|Selectiva)s?(?:\/Optativa)?(?: de Orientación| Técnica APU| \(Ciclo Superior\)| del Ciclo Superior)?(?: (?:[IVX]+|\d+))?(?:\s*[–(].*)?$|^Espacio Electivo$|^Actividades de Formación Complementaria [IVX]+$/;

function endsInArabicDigit(name: string): boolean {
  return /^(.*\S) (10|[1-9])$/.test(name.trim());
}

interface Issue {
  level: 'error' | 'warning';
  message: string;
}

function main(): void {
  const issues: Issue[] = [];
  const rows = OFFICIAL_SUBJECTS;

  // (university, career, normalized name) dedupe
  const byUniCareerName = new Map<string, OfficialSubjectRow[]>();
  // (university, code) dedupe
  const byUniCode = new Map<string, OfficialSubjectRow[]>();
  // per-university, per-career counts
  const byUniversity = new Map<string, number>();
  const byUniversityCareer = new Map<string, number>();
  // normalized-name -> set of careers it appears in, per university (for
  // cross-career share reporting)
  const nameCareersByUni = new Map<string, Map<string, Set<string>>>();

  const catalogCareers = loadCatalogCareers();

  for (const row of rows) {
    if (!catalogCareers.has(`${row.university}|||${row.career}`)) {
      issues.push({
        level: 'error',
        message: `Carrera fuera del catálogo careers/*.json: ${row.university} / ${row.career}`,
      });
    }

    if (!row.name || row.name.trim().length === 0) {
      issues.push({
        level: 'error',
        message: `Nombre vacío: ${row.university} / ${row.career} (code=${row.code})`,
      });
    }

    if (row.year < 1 || row.year > 6) {
      issues.push({
        level: 'error',
        message: `Año fuera de rango (1-6): ${row.university} / ${row.career} / "${row.name}" (year=${row.year})`,
      });
    }

    if (row.university === UNSAM && endsInArabicDigit(row.name)) {
      issues.push({
        level: 'error',
        message: `Nombre termina en dígito arábigo sin corregir: ${row.university} / ${row.career} / "${row.name}"`,
      });
    }

    if (PLACEHOLDER_NAME.test(row.name)) {
      issues.push({
        level: 'error',
        message: `Cupo genérico, no es una materia: ${row.university} / ${row.career} / "${row.name}"`,
      });
    }

    const normalized = normalizeSubjectName(row.name);
    const dedupeKey = `${row.university}|||${row.career}|||${normalized}`;
    if (!byUniCareerName.has(dedupeKey)) byUniCareerName.set(dedupeKey, []);
    byUniCareerName.get(dedupeKey)!.push(row);

    if (row.code) {
      const codeKey = `${row.university}|||${row.code}`;
      if (!byUniCode.has(codeKey)) byUniCode.set(codeKey, []);
      byUniCode.get(codeKey)!.push(row);
    }

    byUniversity.set(
      row.university,
      (byUniversity.get(row.university) ?? 0) + 1,
    );
    const ucKey = `${row.university}|||${row.career}`;
    byUniversityCareer.set(ucKey, (byUniversityCareer.get(ucKey) ?? 0) + 1);

    if (!nameCareersByUni.has(row.university)) {
      nameCareersByUni.set(row.university, new Map());
    }
    const nameCareers = nameCareersByUni.get(row.university)!;
    if (!nameCareers.has(normalized)) nameCareers.set(normalized, new Set());
    nameCareers.get(normalized)!.add(row.career);
  }

  for (const [key, group] of byUniCareerName) {
    if (group.length > 1) {
      const [university, career, normalized] = key.split('|||');
      issues.push({
        level: 'error',
        message: `Materia duplicada en ${university} / ${career}: "${normalized}" (${group.length} filas: ${group
          .map((r) => r.name)
          .join(' | ')})`,
      });
    }
  }

  for (const [key, group] of byUniCode) {
    if (group.length <= 1) continue;
    const normalizedNames = new Set(
      group.map((r) => normalizeSubjectName(r.name)),
    );
    if (normalizedNames.size > 1) {
      const [university, code] = key.split('|||');
      issues.push({
        level: 'error',
        message: `Código duplicado con nombres distintos en ${university}: "${code}" (${group
          .map((r) => `${r.career}: ${r.name}`)
          .join(' | ')})`,
      });
    }
  }

  // Cross-career shares: same normalized name used in 2+ careers of the same
  // university (expected and fine — just reported).
  let crossCareerShares = 0;
  for (const nameCareers of nameCareersByUni.values()) {
    for (const careers of nameCareers.values()) {
      if (careers.size > 1) crossCareerShares += 1;
    }
  }

  console.log(`Total materias: ${rows.length}`);
  console.log('\nPor universidad:');
  for (const [uni, count] of byUniversity) {
    console.log(`  ${uni}: ${count}`);
  }
  console.log('\nPor carrera:');
  for (const [key, count] of byUniversityCareer) {
    const [uni, career] = key.split('|||');
    console.log(`  ${uni} / ${career}: ${count}`);
  }
  console.log(
    `\nMaterias compartidas entre carreras de la misma universidad (mismo nombre normalizado, distinta carrera): ${crossCareerShares}`,
  );

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w.message}`);
  }

  if (errors.length > 0) {
    console.error(`\nErrores (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nOK: sin errores.');
}

main();
