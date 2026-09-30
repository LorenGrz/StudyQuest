/**
 * Layer 2 of the subject-name validation (plan R2): a local list of insults
 * and vulgarities in Rioplatense Spanish (plus a few English ones), matched
 * after leetspeak normalization so "p3l0tud0", "PUUUTO" or "p.u.t.o" are
 * caught too. Deterministic and offline: runs before the AI classifier.
 *
 * Matching is by whole token for short or ambiguous words ("puta" is inside
 * "computación", "culo" inside "cálculo") and by substring for long stems
 * that never appear in real subject names ("pelotud", "conchud").
 */

/** Leetspeak / look-alike characters → letters. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '€': 'e',
};

/**
 * Whole-token words. A token also matches after squeezing stretched letters
 * (see variantsOf), so "puuuuto" and "forrrro" hit "puto" / "forro" while
 * "foro" stays clean.
 */
const TOKEN_WORDS = [
  // insultos
  'boludo',
  'boluda',
  'boludos',
  'boludas',
  'bolu',
  'pelotudo',
  'pelotuda',
  'forro',
  'forra',
  'forros',
  'forras',
  'gil',
  'giles',
  'gila',
  'tarado',
  'tarada',
  'idiota',
  'idiotas',
  'imbecil',
  'imbeciles',
  'estupido',
  'estupida',
  'pendejo',
  'pendeja',
  'mogolico',
  'mogolica',
  'mogolicos',
  'trolo',
  'trola',
  'trolos',
  'puto',
  'puta',
  'putos',
  'putas',
  'putita',
  'marica',
  'maricon',
  'maricones',
  'pajero',
  'pajera',
  'pajeros',
  'paja',
  'pajin',
  'cagon',
  'cagona',
  'cago',
  'cagar',
  'cagada',
  'sorete',
  'soretes',
  'choto',
  'chota',
  'chotos',
  'garca',
  'garcas',
  'turro',
  'turra',
  'conchudo',
  'conchuda',
  'concha',
  'conchas',
  'culiado',
  'culiada',
  'culeado',
  'culeada',
  'culiao',
  'culo',
  'culos',
  'orto',
  'ortos',
  'ojete',
  // vulgaridades sexuales / escatológicas
  'pija',
  'pijas',
  'poronga',
  'porongas',
  'verga',
  'vergas',
  'garcha',
  'garchar',
  'coger',
  'cogida',
  'cogiendo',
  'pete',
  'petes',
  'petero',
  'petera',
  'teta',
  'tetas',
  'mierda',
  'mierdas',
  'chupala',
  'chupame',
  'chupenla',
  'pajearse',
  'porno',
  // siglas
  'hdp',
  'hdmp',
  'lpm',
  'lpmqtp',
  'lpqtp',
  'ctm',
  'ptm',
  'lcdtm',
  'ndeah',
  // odio
  'nazi',
  'nazis',
  'hitler',
  'sudaca',
  'sudacas',
  'bolita',
  'bolitas',
  'paragua',
  'paraguas',
  'villero',
  'villera',
  'negrada',
  // inglés
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'asshole',
  'nigga',
  'nigger',
  'faggot',
  'whore',
];

/** Substrings that are offensive wherever they appear inside a token. */
const TOKEN_STEMS = [
  'pelotud',
  'bolud',
  'conchud',
  'pajer',
  'culiad',
  'culead',
  'mierd',
  'garch',
  'porong',
  'soret',
  'mogolic',
  'chupal',
  'chupam',
  'pendej',
  'cagad',
  'hijodeput',
  'hijadeput',
  'laconchadetu',
  'laputaque',
  'putazo',
  'putito',
  'forrit',
  'trolaz',
  'fuck',
  'shit',
  'bitch',
  'nigg',
];

/**
 * Substrings checked on the whole name with every separator removed, for
 * insults split over several words ("hijo de puta", "la concha de tu madre").
 * Only multi-word phrases: single stems would match across word boundaries
 * ("mapa jerárquico" → "mapajerarquico" contains "pajer").
 */
const PHRASE_STEMS = [
  'hijodeput',
  'hijadeput',
  'hijodepu',
  'laconchadetu',
  'laconchadesu',
  'laputaque',
  'laputamadre',
  'putoelque',
  'andatealaconcha',
  'chupamela',
  'chupamelapija',
  'lamadrequetepa',
  'tuvieja',
];

/** Letter runs of 3+ → 2 ("forrrro" → "forro") and 2+ → 1 ("puuto" → "puto"). */
const variantsOf = (token: string): string[] => [
  token,
  token.replace(/(\p{L})\1{2,}/gu, '$1$1'),
  token.replace(/(\p{L})\1+/gu, '$1'),
];

const TOKEN_SET = new Set(TOKEN_WORDS);

function matchToken(token: string): string | null {
  for (const v of variantsOf(token)) {
    if (TOKEN_SET.has(v)) return v;
    const stem = TOKEN_STEMS.find((s) => v.includes(s));
    if (stem) return stem;
  }
  return null;
}

/**
 * Lowercase, accents removed, leetspeak mapped to letters. Keeps separators
 * as spaces so the result can be split into tokens.
 */
export function normalizeLeet(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[0-9@$!|€]/g, (c) => LEET[c] ?? c)
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();
}

/**
 * The offensive term found in `text` (for logs / moderation), or null when it
 * is clean.
 */
export function findProfanity(text: string): string | null {
  // Letters glued by dots/dashes ("p.u.t.o", "p-u-t-o") count as one token.
  const glued = text.replace(/(?<=\S)[.\-_,:]+(?=\S)/g, '');
  for (const variant of [text, glued]) {
    const normalized = normalizeLeet(variant);
    if (!normalized) continue;
    const tokens = normalized.split(' ');

    // Spaced-out letters ("p u t o") are joined into one candidate token.
    const candidates: string[] = [];
    let run = '';
    for (const token of tokens) {
      if (token.length === 1) {
        run += token;
        continue;
      }
      if (run.length >= 3) candidates.push(run);
      run = '';
      candidates.push(token);
    }
    if (run.length >= 3) candidates.push(run);

    for (const candidate of candidates) {
      const hit = matchToken(candidate);
      if (hit) return hit;
    }

    const joined = tokens.join('');
    for (const v of variantsOf(joined)) {
      const phrase = PHRASE_STEMS.find((p) => v.includes(p));
      if (phrase) return phrase;
    }
  }
  return null;
}
