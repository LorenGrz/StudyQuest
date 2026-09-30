import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderName,
  QuizAiProvider,
  QuizGenerationOptions,
  RawQuestion,
} from './ai.types';
import { BedrockClientService } from './bedrock-client.service';
import { BedrockQuizProvider } from './providers/bedrock-quiz.provider';
import { GeminiQuizProvider } from './providers/gemini-quiz.provider';
import { OpenAiQuizProvider } from './providers/openai-quiz.provider';
import { MockQuizProvider } from './providers/mock-quiz.provider';
import { AnthropicQuizProvider } from './providers/anthropic-quiz.provider';
import { GroqQuizProvider } from './providers/groq-quiz.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Map<AiProviderName, QuizAiProvider>;

  constructor(
    private readonly cfg: ConfigService,
    private readonly bedrockClient: BedrockClientService,
    bedrockProvider: BedrockQuizProvider,
    geminiProvider: GeminiQuizProvider,
    openAiProvider: OpenAiQuizProvider,
    anthropicProvider: AnthropicQuizProvider,
    groqProvider: GroqQuizProvider,
    mockProvider: MockQuizProvider,
  ) {
    this.providers = new Map<AiProviderName, QuizAiProvider>([
      [bedrockProvider.name, bedrockProvider],
      [geminiProvider.name, geminiProvider],
      [openAiProvider.name, openAiProvider],
      [anthropicProvider.name, anthropicProvider],
      [groqProvider.name, groqProvider],
      [mockProvider.name, mockProvider],
    ]);
  }

  /**
   * Generic single-shot chat backed by Bedrock Converse, independent of the
   * AI_PROVIDER used for quiz generation. Used by the study bot and the
   * subject-name classifier (which passes `temperature: 0` and an
   * `abortSignal` for its timeout).
   */
  async chat(
    system: string,
    user: string,
    opts?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      abortSignal?: AbortSignal;
    },
  ): Promise<string> {
    const model =
      opts?.model ??
      this.cfg.get<string>(
        'BEDROCK_MODEL_PRO',
        'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      );
    return this.bedrockClient.converse({
      modelId: model,
      system,
      userMessage: user,
      maxTokens: opts?.maxTokens,
      temperature: opts?.temperature,
      abortSignal: opts?.abortSignal,
    });
  }

  async generateQuestionsFromPdf(
    buffer: Buffer,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const provider = this.resolveProvider(options);
    return provider.generateQuizQuestionsFromPdf(buffer, options);
  }

  async generateQuestionsFromText(
    rawText: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const provider = this.resolveProvider(options);
    return provider.generateQuizQuestionsFromText(rawText, options);
  }

  private resolveProvider(options?: QuizGenerationOptions): QuizAiProvider {
    const providerName =
      options?.provider ??
      (this.cfg.get<string>('AI_PROVIDER', 'bedrock') as AiProviderName);

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new InternalServerErrorException(
        `No existe un proveedor de IA registrado para "${providerName}"`,
      );
    }

    if (!provider.supports('quiz_generation')) {
      throw new InternalServerErrorException(
        `El proveedor "${providerName}" no soporta la tarea quiz_generation`,
      );
    }

    this.logger.debug(`Usando proveedor de IA: ${providerName}`);
    return provider;
  }
}
