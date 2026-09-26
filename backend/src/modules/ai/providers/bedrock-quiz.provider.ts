import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { BedrockClientService } from '../bedrock-client.service';

const TRANSIENT_ERROR_NAMES = new Set([
  'ThrottlingException',
  'ServiceUnavailableException',
  'ModelNotReadyException',
]);

@Injectable()
export class BedrockQuizProvider implements QuizAiProvider {
  readonly name = 'bedrock' as const;
  private readonly logger = new Logger(BedrockQuizProvider.name);

  constructor(
    private readonly cfg: ConfigService,
    private readonly bedrockClient: BedrockClientService,
  ) {}

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
      (chunk) => this.callBedrock(chunk, options),
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
      'BEDROCK_MODEL',
      'us.amazon.nova-2-lite-v1:0',
    );
    const fallbacksRaw = this.cfg.get<string>(
      'BEDROCK_FALLBACK_MODELS',
      'us.amazon.nova-lite-v1:0',
    );
    const fallbacks = fallbacksRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Dedupe, primary first.
    return [...new Set([primary, ...fallbacks])];
  }

  private isTransient(err: unknown): boolean {
    const name = (err as { name?: string } | undefined)?.name;
    if (name && TRANSIENT_ERROR_NAMES.has(name)) return true;
    const status = (
      err as { $metadata?: { httpStatusCode?: number } } | undefined
    )?.$metadata?.httpStatusCode;
    return typeof status === 'number' && status >= 500;
  }

  private async callBedrock(
    chunk: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const userPrompt = buildQuizUserPrompt(chunk, options);
    const maxTokens = Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 8192));

    const models = this.modelChain(options);
    const ATTEMPTS_PER_MODEL = 3;
    let lastErr: unknown;

    // Try each model; within a model, retry transient errors with backoff,
    // then fall through to the next model in the chain.
    for (const modelId of models) {
      for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
        try {
          const text = await this.bedrockClient.converse({
            modelId,
            system: QUIZ_PROMPT,
            userMessage: userPrompt,
            temperature: options?.temperature ?? 0.2,
            maxTokens,
          });
          return safeParseQuestionsJson(text);
        } catch (err: unknown) {
          lastErr = err;
          if (!this.isTransient(err)) throw err;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Bedrock ${modelId} transitorio (${msg.slice(0, 70)}), intento ${attempt + 1}/${ATTEMPTS_PER_MODEL}`,
          );
          if (attempt < ATTEMPTS_PER_MODEL - 1) {
            await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          }
        }
      }
      this.logger.warn(
        `Bedrock ${modelId} agotado, probando el siguiente modelo del fallback`,
      );
    }

    throw lastErr;
  }
}
