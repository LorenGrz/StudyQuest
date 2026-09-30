import { findProfanity } from './profanity-es';

/**
 * Deterministic layers of the "materia real" validation (plan R2). Run
 * before the AI classifier so obvious garbage never costs a model call and a
 * model mistake can never approve something these rules reject.
 *
 *  - layer 1 (`format`): 3–80 chars; only Latin letters (accents included),
 *    digits, spaces and `-.,:()`; no URLs, e-mails, @mentions or phones; no
 *    absurd repetitions ("aaaa", "jajaja"); not ALL CAPS beyond 12 chars;
 *  - layer 1 (`injection`): text addressed to the model ("ignorá las
 *    instrucciones", "respondé true") is rejected outright — the AI prompt
 *    also treats it as data, this is defence in depth;
 *  - layer 2 (`profanity`): the local Rioplatense list with leetspeak
 *    normalization (profanity-es.ts).
 */

export const SUBJECT_NAME_MIN = 3;
export const SUBJECT_NAME_MAX = 80;

export type SubjectNameLayer =
  | 'format'
  | 'injection'
  | 'profanity'
  | 'ai'
  | 'ai_unavailable';

export type SubjectNameCheck =
  | { ok: true; name: string }
  | {
      ok: false;
      layer: SubjectNameLayer;
      /** Machine-readable reason (logs, moderation, UI branching). */
      reason: string;
      /** Friendly Spanish text for the user. */
      message: string;
    };

const EXAMPLE = 'por ejemplo «Análisis Matemático II»';

/**
 * Canonical display form of what the user typed: Unicode NFC, typographic
 * dashes → "-", whitespace collapsed, trimmed. This is what gets stored as
 * `subjects.name` (the dedup key is normalizeSubjectName of it).
 */
export function cleanSubjectName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALLOWED = /^[\p{Script=Latin}\p{N} \-.,:()]+$/u;
// JS `\b` only knows ASCII word chars, so "aprobá" would never end in a
// boundary. These are the Unicode-aware equivalents.
const WS = '(?<![\\p{L}\\p{N}])';
const WE = '(?![\\p{L}\\p{N}])';
const words = (parts: string[]) =>
  new RegExp(parts.map((p) => `${WS}(?:${p})${WE}`).join('|'), 'iu');

const URL_LIKE = new RegExp(
  `https?:|www\\.|[\\p{L}\\p{N}-]+\\.(?:com|net|org|ar|io|xyz|info|edu|gob|gov|me|app|dev|co|tk|ly|site|online)${WE}`,
  'iu',
);
const PHONE_LIKE = /(\d[\s\-.()]*){8,}/;
/** "1810-1990", "1945 - 2001": periods in history subjects, not phones. */
const YEAR_RANGE = /(?<!\d)(1[5-9]|20)\d{2}\s*-\s*(1[5-9]|20)\d{2}(?!\d)/g;
const SAME_CHAR_4 = /(\p{L})\1{3,}/iu;
const REPEATED_CHUNK = /(\p{L}{2,3})\1{2,}/iu;
const LAUGH = words(['(?:j[aeiou]){2,}j?', '(?:ha){3,}', 'xd+', 'lol']);
const VOWELS = /[aeiouyáéíóúüàèìòù]/iu;
const ROMAN = /^[ivxlcdm]+$/i;

/**
 * Phrases addressed to an AI / evaluator. Kept specific on purpose: generic
 * words like "sistema" or "IA" are real subject vocabulary.
 */
const INJECTION = words([
  'ignor[aá](?:r|lo|la|los|las|te)?',
  'ignore',
  'olvid[aá](?:te)?',
  'forget',
  'disregard',
  'aprob[aá](?:la|lo|me)?',
  'approve',
  'respond[eé]',
  'devolv[eé]',
  'marc[aá](?:la|lo)?\\s+como',
  'clasific[aá](?:la|lo)?',
  'prompt',
  'instrucci[oó]n(?:es)?\\s+(?:anterior(?:es)?|previas?|del\\s+sistema)',
  '(?:las|tus|sus)\\s+instrucciones',
  'jailbreak',
  'chat\\s*gpt',
  'llm',
  'json',
  'true',
  'false',
  'valid\\s*[:=]',
]);

const reject = (
  layer: SubjectNameLayer,
  reason: string,
  message: string,
): SubjectNameCheck => ({ ok: false, layer, reason, message });

/** Layer 1: shape of the text. Expects cleanSubjectName() output. */
export function checkSubjectNameFormat(name: string): SubjectNameCheck {
  if (name.length < SUBJECT_NAME_MIN)
    return reject(
      'format',
      'too_short',
      `El nombre es muy corto. Escribí el nombre completo de la materia, ${EXAMPLE}.`,
    );
  if (name.length > SUBJECT_NAME_MAX)
    return reject(
      'format',
      'too_long',
      `El nombre es muy largo (máximo ${SUBJECT_NAME_MAX} caracteres). Dejá solo el nombre de la materia.`,
    );
  if (/[@＠]/.test(name))
    return reject(
      'format',
      'contact_or_mention',
      'El nombre no puede tener e-mails ni @menciones. Escribí solo el nombre de la materia.',
    );
  if (URL_LIKE.test(name))
    return reject(
      'format',
      'url',
      'El nombre no puede tener links. Escribí solo el nombre de la materia.',
    );
  if (!ALLOWED.test(name))
    return reject(
      'format',
      'charset',
      'Usá solo letras, números, espacios y - . , : ( ). Sin emojis ni símbolos raros.',
    );
  if (PHONE_LIKE.test(name.replace(YEAR_RANGE, ' ')))
    return reject(
      'format',
      'phone',
      'El nombre no puede tener números de teléfono. Escribí solo el nombre de la materia.',
    );
  const letters = name.match(/\p{L}/gu) ?? [];
  if (letters.length < 3 || !/^[\p{L}\p{N}(]/u.test(name))
    return reject(
      'format',
      'no_letters',
      `Ese nombre no parece una materia. Escribí el nombre completo, ${EXAMPLE}.`,
    );
  if (SAME_CHAR_4.test(name) || REPEATED_CHUNK.test(name) || LAUGH.test(name))
    return reject(
      'format',
      'repetition',
      `Ese nombre no parece una materia. Escribí el nombre completo, ${EXAMPLE}.`,
    );
  const tokens = name.split(/[^\p{L}]+/u).filter(Boolean);
  if (tokens.some((w) => w.length >= 5 && !VOWELS.test(w) && !ROMAN.test(w)))
    return reject(
      'format',
      'gibberish',
      `Ese nombre no parece una materia. Escribí el nombre completo, ${EXAMPLE}.`,
    );
  const allLetters = letters.join('');
  if (
    name.length > 12 &&
    allLetters === allLetters.toUpperCase() &&
    allLetters !== allLetters.toLowerCase()
  )
    return reject(
      'format',
      'all_caps',
      'Escribilo sin todo en mayúsculas, por ejemplo «Álgebra Lineal».',
    );
  if (INJECTION.test(name))
    return reject(
      'injection',
      'instructions_in_name',
      `Ese nombre no parece una materia. Escribí solo el nombre, ${EXAMPLE}.`,
    );
  return { ok: true, name };
}

/** Layer 2: insults and vulgarities (with leetspeak). */
export function checkSubjectNameProfanity(name: string): SubjectNameCheck {
  const term = findProfanity(name);
  if (term)
    return reject(
      'profanity',
      `profanity:${term}`,
      'Ese nombre tiene palabras que no están permitidas. Escribí el nombre real de la materia.',
    );
  return { ok: true, name };
}

/** Layers 1 and 2 in order; the first rejection wins. */
export function validateSubjectName(raw: string): SubjectNameCheck {
  const name = cleanSubjectName(raw);
  const format = checkSubjectNameFormat(name);
  if (!format.ok) return format;
  return checkSubjectNameProfanity(name);
}
