import { InternalServerErrorException } from '@nestjs/common';
import { RawQuestion } from './ai.types';

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  };
}

const { PDFParse } = require('pdf-parse');

export function validateRawQuestion(q: any): q is RawQuestion {
  return (
    typeof q?.text === 'string' &&
    q.text.length > 10 &&
    Array.isArray(q?.options) &&
    q.options.length === 4 &&
    typeof q?.correctIndex === 'number' &&
    q.correctIndex >= 0 &&
    q.correctIndex <= 3 &&
    typeof q?.explanation === 'string' &&
    typeof q?.topic === 'string' &&
    ['easy', 'medium', 'hard'].includes(q?.difficulty)
  );
}

export function deduplicateRawQuestions(questions: RawQuestion[]): RawQuestion[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    const key = q.text.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function safeParseQuestionsJson(str: string): RawQuestion[] {
  const parsed = safeParseJson(str);
  const questions: RawQuestion[] = parsed?.questions ?? [];
  return questions.filter(validateRawQuestion).map(shuffleOptions);
}

function shuffleOptions(q: RawQuestion): RawQuestion {
  const correct = q.options[q.correctIndex];
  const shuffled = [...q.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { ...q, options: shuffled, correctIndex: shuffled.indexOf(correct) };
}

function safeParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    const cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }
}

export interface ChunkGenerationConfig {
  /** Max number of chunks to send to the model (bounds cost per quest). */
  maxChunks?: number;
  /** Approximate tokens per chunk (chunk size = tokens * 4 chars). */
  chunkTokens?: number;
  /** Called when a single chunk fails, so callers can log without aborting. */
  onError?: (index: number, error: unknown) => void;
}

/**
 * Splits the source text into chunks and generates questions for each one in
 * PARALLEL (they're independent, so wall-clock is one round-trip instead of the
 * sum). Skips failed chunks, throws only if every chunk failed, and dedupes.
 * Shared by every real provider so the chunk/cap/dedupe policy lives in one place.
 */
export async function generateQuestionsFromChunks(
  rawText: string,
  generateForChunk: (chunk: string) => Promise<RawQuestion[]>,
  config: ChunkGenerationConfig = {},
): Promise<RawQuestion[]> {
  const chunkTokens = config.chunkTokens ?? 3000;
  const maxChunks = config.maxChunks ?? 3;
  const chunks = chunkSourceText(rawText, chunkTokens).slice(0, maxChunks);

  const settled = await Promise.allSettled(
    chunks.map((chunk) => generateForChunk(chunk)),
  );

  const questions: RawQuestion[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      questions.push(...result.value);
    } else {
      config.onError?.(index, result.reason);
    }
  });

  if (questions.length === 0) {
    throw new InternalServerErrorException('No se pudieron generar preguntas');
  }

  return deduplicateRawQuestions(questions);
}

export function chunkSourceText(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * 4;
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result?.text ?? '';

  await parser.destroy().catch(() => undefined);

  if (!text || text.trim().length < 50) {
    throw new InternalServerErrorException('El PDF no tiene suficiente texto');
  }
  return text;
}
