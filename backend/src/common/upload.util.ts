import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/x-markdown': '.md',
  'text/csv': '.csv',
  'text/html': '.html',
  'application/json': '.json',
  'application/rtf': '.rtf',
  'text/rtf': '.rtf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/epub+zip': '.epub',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const SAFE_EXT = new Set(Object.values(EXT_BY_MIME));

/**
 * `<uuid><ext>` where `<ext>` comes from the declared mimetype, never from the
 * client-supplied `originalname` (which could carry `.html` / `.svg` / `.php`).
 * Falls back to a whitelisted originalname extension, else `.bin`.
 */
export function safeUploadFilename(file: {
  mimetype?: string;
  originalname?: string;
}): string {
  const fromMime = file.mimetype ? EXT_BY_MIME[file.mimetype] : undefined;
  const fromName = file.originalname
    ? extname(file.originalname).toLowerCase()
    : '';
  const ext = fromMime ?? (SAFE_EXT.has(fromName) ? fromName : '.bin');
  return `${randomUUID()}${ext}`;
}

// ─── Quest source documents ──────────────────────────────────────────────────
//
// The quiz generator feeds these through the MarkItDown sidecar (text path) and,
// for real PDFs only, a native multimodal fallback. Everything here is a
// document format MarkItDown can parse.

/** Extensions accepted as a quest source document. */
export const QUEST_DOC_EXTS = [
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.html',
  '.json',
  '.rtf',
  '.doc',
  '.docx',
  '.odt',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.epub',
] as const;

export type QuestDocExt = (typeof QUEST_DOC_EXTS)[number];

const QUEST_DOC_EXT_SET = new Set<string>(QUEST_DOC_EXTS);

/** File extension family used to sniff the magic bytes. */
type DocFamily = 'pdf' | 'zip' | 'ole' | 'text';

const FAMILY_BY_EXT: Record<QuestDocExt, DocFamily> = {
  '.pdf': 'pdf',
  '.txt': 'text',
  '.md': 'text',
  '.csv': 'text',
  '.html': 'text',
  '.json': 'text',
  '.rtf': 'text',
  '.doc': 'ole',
  '.docx': 'zip',
  '.odt': 'zip',
  '.ppt': 'ole',
  '.pptx': 'zip',
  '.xls': 'ole',
  '.xlsx': 'zip',
  '.epub': 'zip',
};

const PDF_MAGIC = Buffer.from('%PDF-');
const ZIP_MAGIC = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/** Real PDFs start with the bytes `%PDF-`. mimetype alone is client-controlled. */
export function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).equals(PDF_MAGIC);
}

/**
 * `true` when `originalname`'s extension is an accepted quest document AND the
 * buffer's leading bytes match that extension's format family — so a `.docx`
 * that is really an HTML page, or a renamed executable, is rejected before it
 * reaches MarkItDown or the `/uploads` static mount.
 */
export function looksLikeQuestDocument(
  buf: Buffer,
  originalname: string | undefined,
): boolean {
  const ext = extname(originalname ?? '').toLowerCase();
  if (!QUEST_DOC_EXT_SET.has(ext)) return false;
  const family = FAMILY_BY_EXT[ext as QuestDocExt];

  switch (family) {
    case 'pdf':
      return looksLikePdf(buf);
    case 'zip':
      return ZIP_MAGIC.some(
        (m) => buf.length >= m.length && buf.subarray(0, m.length).equals(m),
      );
    case 'ole':
      return (
        buf.length >= OLE_MAGIC.length &&
        buf.subarray(0, OLE_MAGIC.length).equals(OLE_MAGIC)
      );
    case 'text':
      return isPlausibleText(buf);
  }
}

/** Accepted only if `originalname` carries a known quest-document extension. */
export function isQuestDocumentExt(originalname: string | undefined): boolean {
  return QUEST_DOC_EXT_SET.has(extname(originalname ?? '').toLowerCase());
}

/**
 * Text formats (`.txt/.md/.csv/.html/.json/.rtf`) have no reliable magic number.
 * Reject anything with NUL bytes in the first 8 KB or that is not valid UTF-8 —
 * that rules out binaries renamed to `.txt`.
 */
function isPlausibleText(buf: Buffer): boolean {
  if (buf.length === 0) return false;
  const head = buf.subarray(0, 8192);
  if (head.includes(0x00)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(head);
    return true;
  } catch {
    return false;
  }
}
