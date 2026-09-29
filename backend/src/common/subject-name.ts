/**
 * Canonical form of a subject / career / university name, used for dedup
 * (`subjects.name_normalized`, `careers.name_normalized`) and for matching the
 * legacy free-text columns in the backfill migration. The migration imports
 * this same function, so the DB and the API never disagree.
 *
 *  - lowercase, accents stripped (ñ → n, like Postgres `unaccent`);
 *  - punctuation / symbols become spaces ("Derecho Privado I - Civil",
 *    "Mat. Discreta", "Física 1°");
 *  - standalone 1–10 become roman numerals i…x, so "Análisis Matemático 1"
 *    and "analisis matematico I" normalize to the same string;
 *  - whitespace collapsed and trimmed.
 */
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

export function normalizeSubjectName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const n = /^(?:[1-9]|10)$/.test(token) ? Number(token) : 0;
      return n ? ROMAN[n - 1] : token;
    })
    .join(' ');
}
