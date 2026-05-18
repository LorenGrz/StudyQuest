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
    geminiProvider: GeminiQuizProvider,
    openAiProvider: OpenAiQuizProvider,
    anthropicProvider: AnthropicQuizProvider,
    groqProvider: GroqQuizProvider,
    mockProvider: MockQuizProvider,
  ) {
    this.providers = new Map<AiProviderName, QuizAiProvider>([
      [geminiProvider.name, geminiProvider],
      [openAiProvider.name, openAiProvider],
      [anthropicProvider.name, anthropicProvider],
      [groqProvider.name, groqProvider],
      [mockProvider.name, mockProvider],
    ]);
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

  private resolveProvider(
    options?: QuizGenerationOptions,
  ): QuizAiProvider {
    const providerName =
      options?.provider ??
      (this.cfg.get<string>('AI_PROVIDER', 'gemini') as AiProviderName);

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
