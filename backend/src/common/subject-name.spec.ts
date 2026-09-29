import { normalizeSubjectName } from './subject-name';

describe('normalizeSubjectName', () => {
  it('treats arabic and roman numerals as the same subject', () => {
    expect(normalizeSubjectName('Análisis Matemático 1')).toBe(
      normalizeSubjectName('analisis matematico I'),
    );
    expect(normalizeSubjectName('Análisis Matemático 1')).toBe(
      'analisis matematico i',
    );
  });

  it('lowercases and strips accents (ñ → n)', () => {
    expect(normalizeSubjectName('DISEÑO Lógico')).toBe('diseno logico');
  });

  it('drops decorative punctuation and collapses spaces', () => {
    expect(normalizeSubjectName('  Derecho Privado I -  Civil ')).toBe(
      'derecho privado i civil',
    );
    expect(normalizeSubjectName('Mat. Discreta (Anual)')).toBe(
      'mat discreta anual',
    );
    expect(normalizeSubjectName('Física 2°')).toBe('fisica ii');
  });

  it('maps 1..10 as standalone tokens only', () => {
    expect(normalizeSubjectName('Inglés 10')).toBe('ingles x');
    expect(normalizeSubjectName('Programación 3')).toBe('programacion iii');
    expect(normalizeSubjectName('Plan 2023')).toBe('plan 2023');
    expect(normalizeSubjectName('Taller 11')).toBe('taller 11');
    expect(normalizeSubjectName('Química 01')).toBe('quimica 01');
    expect(normalizeSubjectName('Física1')).toBe('fisica1');
  });

  it('keeps roman numerals as they are', () => {
    expect(normalizeSubjectName('Programación III')).toBe('programacion iii');
  });

  it('is idempotent', () => {
    const once = normalizeSubjectName('Álgebra y Geometría Analítica 2');
    expect(normalizeSubjectName(once)).toBe(once);
  });

  it('returns an empty string for punctuation-only input', () => {
    expect(normalizeSubjectName(' -- . ')).toBe('');
  });
});
