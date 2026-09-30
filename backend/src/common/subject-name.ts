/**
 * Canonical form of a subject / career / university name, used for dedup
 * (`subjects.name_normalized`, `careers.name_normalized`) and for matching the
 * legacy free-text columns in the backfill migration. The migration imports
 * this same function, so the DB and the API never disagree.
 *
 *  - lowercase; accents removed by Unicode NFD decomposition + dropping the
 *    combining marks (á → a, ñ → n, ü → u). Letters that don't decompose
 *    (ø, ł, ß) are kept as they are — this is not Postgres `unaccent`;
 *  - ordinals "1º", "2ª", "3 °" become the bare number;
 *  - `+` / `#` attached to a word are spelled out, so "C++", "C#" and "C"
 *    stay different ("c plus plus", "c sharp", "c");
 *  - any other punctuation / symbol becomes a space ("Derecho Privado I -
 *    Civil", "Mat. Discreta");
 *  - standalone 1–10 become roman numerals i…x, so "Análisis Matemático 1"
 *    and "analisis matematico I" normalize to the same string;
 *  - whitespace collapsed and trimmed.
 *
 * The output only ever contains letters, digits and single spaces; the
 * backfill relies on that for its " ~<code>" disambiguation suffix.
 */
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

export function normalizeSubjectName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/(\d+)\s*[ºª°]/gu, '$1')
    .replace(/(?<=[\p{L}\p{N}+])\+/gu, ' plus ')
    .replace(/(?<=[\p{L}\p{N}])#/gu, ' sharp ')
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
