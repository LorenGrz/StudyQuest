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

  it('keeps letters that NFD does not decompose (ø, ł, ß)', () => {
    expect(normalizeSubjectName('Ørsted Łódź Straße')).toBe(
      'ørsted łodz straße',
    );
  });

  it('treats ordinals as the bare number', () => {
    expect(normalizeSubjectName('Física 1º')).toBe(
      normalizeSubjectName('Fisica I'),
    );
    expect(normalizeSubjectName('Química 2ª')).toBe('quimica ii');
    expect(normalizeSubjectName('Taller 3 °')).toBe('taller iii');
  });

  it('keeps C, C++ and C# apart', () => {
    const c = normalizeSubjectName('Programación en C');
    const cpp = normalizeSubjectName('Programación en C++');
    const cs = normalizeSubjectName('Programación en C#');
    expect(cpp).toBe('programacion en c plus plus');
    expect(cs).toBe('programacion en c sharp');
    expect(new Set([c, cpp, cs]).size).toBe(3);
  });

  it('drops a standalone + or # like any other punctuation', () => {
    expect(normalizeSubjectName('Álgebra + Geometría')).toBe(
      'algebra geometria',
    );
    expect(normalizeSubjectName('Tema #3')).toBe('tema iii');
  });

  it('only ever outputs letters, digits and single spaces', () => {
    for (const raw of ['C++ / C# ~x', 'a~b', 'x  #  y', '¡Hola! ¿Qué?']) {
      expect(normalizeSubjectName(raw)).toMatch(/^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u);
    }
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
