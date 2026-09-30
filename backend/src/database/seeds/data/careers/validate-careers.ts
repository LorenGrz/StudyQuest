/**
 * Valida el catálogo oficial de carreras (`backend/src/database/seeds/data/careers/*.json`).
 *
 * Cada archivo es la fuente de verdad de una universidad:
 * `{ university: { name, shortName, website, careersSourceUrls }, careers: [{ name, faculty, level, sourceUrl }] }`.
 *
 * Reglas:
 *  - Esquema: todos los campos presentes y strings no vacíos (`careersSourceUrls`
 *    y `careers` no vacíos).
 *  - `level` ∈ {"grado", "pregrado"}.
 *  - Toda URL (`university.website`, `careersSourceUrls[]`, `careers[].sourceUrl`) empieza con `https://`.
 *  - Sin carreras duplicadas dentro de una universidad después de normalizar el
 *    nombre (minúsculas + NFD sin acentos + colapsar espacios + sin puntuación).
 *  - Sin nombres de universidad duplicados entre archivos.
 *
 * Uso: `pnpm exec ts-node -P tsconfig.seed.json src/database/seeds/data/careers/validate-careers.ts`
 * (o `pnpm careers:validate` desde `backend/`). Sale con código 1 si encuentra errores.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CareerRow {
  name: string;
  faculty: string;
  level: string;
  sourceUrl: string;
}

interface UniversityFile {
  university: {
    name: string;
    shortName: string;
    website: string;
    careersSourceUrls: string[];
  };
  careers: CareerRow[];
}

const VALID_LEVELS = new Set(['grado', 'pregrado']);
const CAREERS_DIR = __dirname;

function normalizeCareerName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos (diacríticos NFD)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // quita puntuación, deja letras/números/espacios
    .replace(/\s+/g, ' ')
    .trim();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  return isNonEmptyString(value) && value.startsWith('https://');
}

const errors: string[] = [];
const summary: {
  file: string;
  universityName: string;
  total: number;
  grado: number;
  pregrado: number;
}[] = [];
const universityNamesSeen = new Map<string, string>(); // normalized name -> file

const files = fs
  .readdirSync(CAREERS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error(`No se encontró ningún *.json en ${CAREERS_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const filePath = path.join(CAREERS_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');

  let parsed: UniversityFile;
  try {
    parsed = JSON.parse(raw) as UniversityFile;
  } catch (e) {
    errors.push(`${file}: JSON inválido (${(e as Error).message})`);
    continue;
  }

  const university = parsed.university;
  const careers = parsed.careers;

  if (!university || typeof university !== 'object') {
    errors.push(`${file}: falta "university"`);
    continue;
  }
  if (!Array.isArray(careers)) {
    errors.push(`${file}: falta "careers" o no es un array`);
    continue;
  }

  if (!isNonEmptyString(university.name)) {
    errors.push(`${file}: university.name vacío o ausente`);
  }
  if (!isNonEmptyString(university.shortName)) {
    errors.push(`${file}: university.shortName vacío o ausente`);
  }
  if (!isHttpsUrl(university.website)) {
    errors.push(
      `${file}: university.website ausente o no empieza con https:// (${String(university.website)})`,
    );
  }
  if (
    !Array.isArray(university.careersSourceUrls) ||
    university.careersSourceUrls.length === 0
  ) {
    errors.push(`${file}: university.careersSourceUrls vacío o ausente`);
  } else {
    university.careersSourceUrls.forEach((url, i) => {
      if (!isHttpsUrl(url)) {
        errors.push(
          `${file}: careersSourceUrls[${i}] no empieza con https:// (${String(url)})`,
        );
      }
    });
  }

  if (careers.length === 0) {
    errors.push(`${file}: "careers" está vacío`);
  }

  if (isNonEmptyString(university.name)) {
    const normalizedUniName = normalizeCareerName(university.name);
    const existingFile = universityNamesSeen.get(normalizedUniName);
    if (existingFile && existingFile !== file) {
      errors.push(
        `${file}: university.name "${university.name}" duplicado, ya usado en ${existingFile}`,
      );
    } else {
      universityNamesSeen.set(normalizedUniName, file);
    }
  }

  const seenNormalizedNames = new Map<string, string>(); // normalized -> original name
  let grado = 0;
  let pregrado = 0;

  careers.forEach((career, i) => {
    const where = `${file} careers[${i}]`;

    if (!isNonEmptyString(career.name)) {
      errors.push(`${where}: name vacío o ausente`);
    }
    if (!isNonEmptyString(career.faculty)) {
      errors.push(`${where}: faculty vacío o ausente (name="${career.name}")`);
    }
    if (!isNonEmptyString(career.level) || !VALID_LEVELS.has(career.level)) {
      errors.push(
        `${where}: level inválido "${String(career.level)}" (debe ser "grado" o "pregrado") (name="${career.name}")`,
      );
    } else if (career.level === 'grado') {
      grado += 1;
    } else {
      pregrado += 1;
    }
    if (!isHttpsUrl(career.sourceUrl)) {
      errors.push(
        `${where}: sourceUrl ausente o no empieza con https:// (name="${career.name}", sourceUrl=${String(career.sourceUrl)})`,
      );
    }

    if (isNonEmptyString(career.name)) {
      const normalized = normalizeCareerName(career.name);
      const existing = seenNormalizedNames.get(normalized);
      if (existing) {
        errors.push(
          `${file}: carrera duplicada tras normalizar: "${career.name}" ~ "${existing}"`,
        );
      } else {
        seenNormalizedNames.set(normalized, career.name);
      }
    }
  });

  summary.push({
    file,
    universityName: university.name ?? '(sin nombre)',
    total: careers.length,
    grado,
    pregrado,
  });
}

console.log('--- Catálogo de carreras por universidad ---');
for (const s of summary) {
  console.log(
    `${s.file} (${s.universityName}): ${s.total} carreras — ${s.grado} grado, ${s.pregrado} pregrado`,
  );
}

if (errors.length > 0) {
  console.error('\n--- Errores ---');
  for (const error of errors) {
    console.error(`✗ ${error}`);
  }
  console.error(`\n${errors.length} error(es) encontrados.`);
  process.exit(1);
}

const totalCareers = summary.reduce((acc, s) => acc + s.total, 0);
console.log(
  `\nOK: ${totalCareers} carreras validadas sin errores en ${files.length} universidad(es).`,
);
