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
      model: options?.model ?? this.cfg.get('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 8192)),
      },
    });

    const fullPrompt = `${QUIZ_PROMPT}\n\n${buildQuizUserPrompt(chunk, options)}`;

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(fullPrompt);
        return safeParseQuestionsJson(result.response.text());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('503') || attempt === 2) throw err;
        this.logger.warn(`Gemini 503, reintentando (${attempt + 1}/3)...`);
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        lastErr = err;
      }
    }
    throw lastErr;
  }
}
