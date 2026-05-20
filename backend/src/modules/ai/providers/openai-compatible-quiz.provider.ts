import {
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

export abstract class OpenAiCompatibleQuizProvider
  implements QuizAiProvider
{
  abstract readonly name:
    | 'openai'
    | 'groq';

  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly cfg: ConfigService) {}

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
    const allQuestions: RawQuestion[] = [];

    for (let i = 0; i < maxChunks; i++) {
      try {
        const questions = await this.callChatCompletions(chunks[i], options);
        allQuestions.push(...questions);
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

  protected abstract getApiKeyEnv(): string;
  protected abstract getModelEnv(): string;
  protected abstract getDefaultModel(): string;
  protected abstract getEndpoint(): string;

  private async callChatCompletions(
    chunk: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const apiKey = this.cfg.get<string>(this.getApiKeyEnv());
    if (!apiKey) {
      throw new InternalServerErrorException(
        `Falta ${this.getApiKeyEnv()} para usar el proveedor ${this.name}`,
      );
    }

    const model =
      options?.model ??
      this.cfg.get(this.getModelEnv(), this.getDefaultModel());

    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: options?.temperature ?? 0.2,
        messages: [
          {
            role: 'system',
            content: QUIZ_PROMPT,
          },
          {
            role: 'user',
            content: buildQuizUserPrompt(chunk, options),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `${this.name} devolvio ${response.status}: ${body}`,
      );
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException(
        `La respuesta de ${this.name} no contiene contenido util`,
      );
    }

    return safeParseQuestionsJson(content);
  }
}
