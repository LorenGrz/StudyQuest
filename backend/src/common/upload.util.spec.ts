import {
  safeUploadFilename,
  looksLikePdf,
  looksLikeQuestDocument,
  isQuestDocumentExt,
} from './upload.util';

describe('safeUploadFilename', () => {
  it('derives the extension from the mimetype, never from originalname', () => {
    const name = safeUploadFilename({
      mimetype: 'application/pdf',
      originalname: 'malicious.html',
    });
    expect(name).toMatch(/^[0-9a-f-]{36}\.pdf$/);
  });

  it('falls back to a whitelisted originalname extension', () => {
    const name = safeUploadFilename({ originalname: 'notes.md' });
    expect(name.endsWith('.md')).toBe(true);
  });

  it('falls back to .bin for an unknown type', () => {
    const name = safeUploadFilename({ originalname: 'thing.exe' });
    expect(name.endsWith('.bin')).toBe(true);
  });
});

describe('isQuestDocumentExt', () => {
  it.each(['a.pdf', 'a.docx', 'a.MD', 'a.txt', 'a.pptx', 'a.csv'])(
    'accepts %s',
    (n) => expect(isQuestDocumentExt(n)).toBe(true),
  );

  it.each(['a.exe', 'a.svg', 'a.js', 'a', undefined])('rejects %s', (n) =>
    expect(isQuestDocumentExt(n as string)).toBe(false),
  );
});

describe('looksLikePdf', () => {
  it('is true only for a %PDF- header', () => {
    expect(looksLikePdf(Buffer.from('%PDF-1.7 ...'))).toBe(true);
    expect(looksLikePdf(Buffer.from('PK'))).toBe(false);
  });
});

describe('looksLikeQuestDocument', () => {
  it('accepts a real pdf', () => {
    expect(looksLikeQuestDocument(Buffer.from('%PDF-1.4 x'), 'a.pdf')).toBe(
      true,
    );
  });

  it('accepts a zip-based office file (docx/pptx/xlsx/odt/epub)', () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(looksLikeQuestDocument(zip, 'a.docx')).toBe(true);
    expect(looksLikeQuestDocument(zip, 'a.pptx')).toBe(true);
  });

  it('accepts a legacy OLE2 .doc', () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(looksLikeQuestDocument(ole, 'a.doc')).toBe(true);
  });

  it('accepts plain UTF-8 text for .txt/.md', () => {
    expect(
      looksLikeQuestDocument(Buffer.from('# Título\ncontenido'), 'a.md'),
    ).toBe(true);
  });

  it('rejects a docx whose bytes are actually HTML', () => {
    expect(
      looksLikeQuestDocument(Buffer.from('<html><script>x</script>'), 'a.docx'),
    ).toBe(false);
  });

  it('rejects a .txt that carries NUL bytes (a renamed binary)', () => {
    expect(
      looksLikeQuestDocument(Buffer.from([0x00, 0x01, 0x02, 0x03]), 'a.txt'),
    ).toBe(false);
  });

  it('rejects an unknown extension outright', () => {
    expect(looksLikeQuestDocument(Buffer.from('%PDF-1.4'), 'a.exe')).toBe(
      false,
    );
  });
});
