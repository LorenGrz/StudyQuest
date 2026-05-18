import {
  Injectable,
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

@Injectable()
export class AnthropicQuizProvider implements QuizAiProvider {
  readonly name = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicQuizProvider.name);

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
    const allQuestions: RawQuestion[] = [];

    for (let i = 0; i < maxChunks; i++) {
      try {
        const questions = await this.callAnthropic(chunks[i], options);
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

  private async callAnthropic(
    chunk: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const apiKey = this.cfg.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Falta ANTHROPIC_API_KEY para usar el proveedor anthropic',
      );
    }

    const model =
      options?.model ??
      this.cfg.get('ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: options?.temperature ?? 0.2,
        system: QUIZ_PROMPT,
        messages: [
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
        `anthropic devolvio ${response.status}: ${body}`,
      );
    }

    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const content = body.content?.find((item) => item.type === 'text')?.text;
    if (!content) {
      throw new InternalServerErrorException(
        'La respuesta de anthropic no contiene contenido util',
      );
    }

    return safeParseQuestionsJson(content);
  }
}
