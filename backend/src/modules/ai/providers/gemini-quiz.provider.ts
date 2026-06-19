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
  chunkSourceText,
  deduplicateRawQuestions,
  extractTextFromPdf,
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
    const chunks = chunkSourceText(rawText, 3000);
    const maxChunks = Math.min(chunks.length, 3);
    this.logger.log(`Generando preguntas de ${maxChunks} fragmento(s)...`);

    const allQuestions: RawQuestion[] = [];

    for (let i = 0; i < maxChunks; i++) {
      try {
        const questions = await this.callGemini(chunks[i], options);
        allQuestions.push(...questions);
        this.logger.log(
          `Fragmento ${i + 1}/${maxChunks}: ${questions.length} preguntas`,
        );
      } catch (err) {
        this.logger.error(`Error en fragmento ${i + 1}: ${err.message}`);
      }
    }

    if (allQuestions.length === 0) {
      throw new InternalServerErrorException(
        'No se pudieron generar preguntas',
      );
    }

    return deduplicateRawQuestions(allQuestions);
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
      model: options?.model ?? this.cfg.get('GEMINI_MODEL', 'gemini-2.0-flash'),
    });

    const result = await model.generateContent(
      `${QUIZ_PROMPT}\n\n${buildQuizUserPrompt(chunk, options)}`,
    );

    return safeParseQuestionsJson(result.response.text());
  }
}
