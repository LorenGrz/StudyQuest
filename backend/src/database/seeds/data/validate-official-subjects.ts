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
 *
 * Imprime conteos por universidad y por carrera.
 */
import { OFFICIAL_SUBJECTS, OfficialSubjectRow } from './official-subjects';

const UNSAM = 'Universidad Nacional de San Martín';

const ARABIC_TO_ROMAN = [
  '',
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
];

// TODO: use common/subject-name.ts after R1 merges (same normalization,
// already shared with the backend and the backfill migration).
/** lowercase, strip accents (NFD), arabic 1-10 standalone tokens -> roman,
 * strip decorative punctuation, collapse spaces. */
function normalizeSubjectName(raw: string): string {
  let s = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.toLowerCase();
  s = s.replace(/\b(10|[1-9])\b/g, (m) => ARABIC_TO_ROMAN[parseInt(m, 10)]);
  s = s.replace(/[.,:()\-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

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

  for (const row of rows) {
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
