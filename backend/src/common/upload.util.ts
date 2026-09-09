import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
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

const PDF_MAGIC = Buffer.from('%PDF-');

/** Real PDFs start with the bytes `%PDF-`. mimetype alone is client-controlled. */
export function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).equals(PDF_MAGIC);
}
