import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import type {
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

function createProvider(
  name: AiProviderName,
  impl?: Partial<QuizAiProvider>,
): QuizAiProvider {
  return {
    name,
    supports: jest.fn().mockReturnValue(true),
    generateQuizQuestionsFromText: jest.fn(async () => [] as RawQuestion[]),
    generateQuizQuestionsFromPdf: jest.fn(async () => [] as RawQuestion[]),
    ...impl,
  };
}

describe('AiService provider routing', () => {
  let service: AiService;
  let geminiProvider: QuizAiProvider;
  let openAiProvider: QuizAiProvider;
  let mockProvider: QuizAiProvider;
  let anthropicProvider: QuizAiProvider;
  let groqProvider: QuizAiProvider;

  beforeEach(async () => {
    geminiProvider = createProvider('gemini');
    openAiProvider = createProvider('openai');
    mockProvider = createProvider('mock');
    anthropicProvider = createProvider('anthropic');
    groqProvider = createProvider('groq');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) =>
              key === 'AI_PROVIDER' ? 'mock' : defaultValue,
            ),
          },
        },
        { provide: GeminiQuizProvider, useValue: geminiProvider },
        { provide: OpenAiQuizProvider, useValue: openAiProvider },
        { provide: MockQuizProvider, useValue: mockProvider },
        { provide: AnthropicQuizProvider, useValue: anthropicProvider },
        { provide: GroqQuizProvider, useValue: groqProvider },
      ],
    }).compile();

    service = moduleRef.get(AiService);
  });

  it('uses AI_PROVIDER as the default provider', async () => {
    await service.generateQuestionsFromText('texto de prueba');

    expect(mockProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto de prueba',
      undefined,
    );
    expect(geminiProvider.generateQuizQuestionsFromText).not.toHaveBeenCalled();
  });

  it('allows overriding the provider per request', async () => {
    const options: QuizGenerationOptions = { provider: 'gemini' };

    await service.generateQuestionsFromText('texto override', options);

    expect(geminiProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto override',
      options,
    );
    expect(mockProvider.generateQuizQuestionsFromText).not.toHaveBeenCalled();
  });

  it('fails when the selected provider does not support quiz generation', async () => {
    (openAiProvider.supports as jest.Mock).mockReturnValue(false);

    await expect(
      service.generateQuestionsFromText('texto', { provider: 'openai' }),
    ).rejects.toThrow(/no soporta la tarea quiz_generation/i);
  });

  it('fails when the selected provider is not registered', async () => {
    await expect(
      service.generateQuestionsFromText('texto', {
        provider: 'desconocido' as AiProviderName,
      }),
    ).rejects.toThrow(/no existe un proveedor de ia registrado/i);
  });

  it('routes overrides to anthropic and groq providers too', async () => {
    await service.generateQuestionsFromText('texto anthropic', {
      provider: 'anthropic',
    });
    await service.generateQuestionsFromText('texto groq', {
      provider: 'groq',
    });

    expect(anthropicProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto anthropic',
      { provider: 'anthropic' },
    );
    expect(groqProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto groq',
      { provider: 'groq' },
    );
  });
});
