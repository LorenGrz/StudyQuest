import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AiTaskKind,
  QuizAiProvider,
  QuizGenerationOptions,
  RawQuestion,
} from '../ai.types';
import {
  extractTextFromPdf,
  generateQuestionsFromChunks,
  safeParseQuestionsJson,
} from '../raw-question.utils';
import { QUIZ_PROMPT, buildQuizUserPrompt } from '../quiz-prompt';

@Injectable()
export class GeminiQuizProvider implements QuizAiProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger(GeminiQuizProvider.name);

  constructor(private readonly cfg: ConfigService) {}

  supports(task: AiTaskKind): boolean {
    return task === 'quiz_generation';
  }

  async generateQuizQuestionsFromPdf(
    buffer: Buffer,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    this.logger.log('Extrayendo texto del PDF...');
    const text = await extractTextFromPdf(buffer);
    return this.generateQuizQuestionsFromText(text, options);
  }

  async generateQuizQuestionsFromText(
    rawText: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    return generateQuestionsFromChunks(
      rawText,
      (chunk) => this.callGemini(chunk, options),
      {
        maxChunks: Number(this.cfg.get('AI_MAX_CHUNKS', 3)),
        chunkTokens: Number(this.cfg.get('AI_CHUNK_TOKENS', 3000)),
        onError: (i, err) =>
          this.logger.error(
            `Error en fragmento ${i + 1}: ${(err as Error)?.message}`,
          ),
      },
    );
  }

  private modelChain(options?: QuizGenerationOptions): string[] {
    if (options?.model) return [options.model];
    const primary = this.cfg.get<string>(
      'GEMINI_MODEL',
      'gemini-flash-lite-latest',
    );
    const fallbacksRaw = this.cfg.get<string>(
      'GEMINI_FALLBACK_MODELS',
      'gemini-3.5-flash-lite,gemini-flash-latest',
    );
    const fallbacks = fallbacksRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Dedupe, primary first.
    return [...new Set([primary, ...fallbacks])];
  }

  private isTransient(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return /\b(429|500|502|503|504|UNAVAILABLE|overloaded|high demand)\b/i.test(
      msg,
    );
  }

  private async callGemini(
    chunk: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Falta GEMINI_API_KEY para usar el proveedor gemini',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const userPrompt = buildQuizUserPrompt(chunk, options);
    const generationConfig = {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 8192)),
    };

    const models = this.modelChain(options);
    const ATTEMPTS_PER_MODEL = 3;
    let lastErr: unknown;

    // Try each model; within a model, retry transient (overload) errors with
    // backoff, then fall through to the next model in the chain.
    for (const modelName of models) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        // Rules go in systemInstruction; only the (untrusted) study material is
        // sent as content → the model treats it as data, not instructions.
        systemInstruction: QUIZ_PROMPT,
        generationConfig,
      });

      for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
        try {
          const result = await model.generateContent(userPrompt);
          return safeParseQuestionsJson(result.response.text());
        } catch (err: unknown) {
          lastErr = err;
          if (!this.isTransient(err)) throw err;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Gemini ${modelName} transitorio (${msg.slice(0, 70)}), intento ${attempt + 1}/${ATTEMPTS_PER_MODEL}`,
          );
          if (attempt < ATTEMPTS_PER_MODEL - 1) {
            await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          }
        }
      }
      this.logger.warn(
        `Gemini ${modelName} agotado, probando el siguiente modelo del fallback`,
      );
    }

    throw lastErr;
  }
}
