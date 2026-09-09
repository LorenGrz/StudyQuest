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
    const model = genAI.getGenerativeModel({
      model:
        options?.model ?? this.cfg.get('GEMINI_MODEL', 'gemini-flash-latest'),
      // Rules go in systemInstruction; only the (untrusted) study material is
      // sent as content → the model treats it as data, not instructions.
      systemInstruction: QUIZ_PROMPT,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 8192)),
      },
    });

    const userPrompt = buildQuizUserPrompt(chunk, options);

    const MAX_ATTEMPTS = 4;
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const result = await model.generateContent(userPrompt);
        return safeParseQuestionsJson(result.response.text());
      } catch (err: unknown) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        // 429 rate limit / 500 / 503 overload → transitorios, reintentar con backoff.
        const transient = /\b(429|500|503)\b/.test(msg);
        if (!transient || attempt === MAX_ATTEMPTS - 1) throw err;
        this.logger.warn(
          `Gemini transitorio (${msg.slice(0, 80)}), reintento ${attempt + 1}/${MAX_ATTEMPTS - 1}...`,
        );
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
}
