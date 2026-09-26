import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import type {
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
  let bedrockProvider: QuizAiProvider;
  let geminiProvider: QuizAiProvider;
  let openAiProvider: QuizAiProvider;
  let mockProvider: QuizAiProvider;
  let anthropicProvider: QuizAiProvider;
  let groqProvider: QuizAiProvider;

  beforeEach(async () => {
    bedrockProvider = createProvider('bedrock');
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
        {
          provide: BedrockClientService,
          useValue: { converse: jest.fn() },
        },
        { provide: BedrockQuizProvider, useValue: bedrockProvider },
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

    expect(
      anthropicProvider.generateQuizQuestionsFromText,
    ).toHaveBeenCalledWith('texto anthropic', { provider: 'anthropic' });
    expect(groqProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto groq',
      { provider: 'groq' },
    );
  });

  it('routes overrides to bedrock too', async () => {
    await service.generateQuestionsFromText('texto bedrock', {
      provider: 'bedrock',
    });

    expect(bedrockProvider.generateQuizQuestionsFromText).toHaveBeenCalledWith(
      'texto bedrock',
      { provider: 'bedrock' },
    );
  });
});

describe('AiService.chat', () => {
  let service: AiService;
  let bedrockClient: { converse: jest.Mock };
  let cfg: { get: jest.Mock };

  beforeEach(async () => {
    bedrockClient = { converse: jest.fn().mockResolvedValue('respuesta') };
    cfg = {
      get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: cfg },
        { provide: BedrockClientService, useValue: bedrockClient },
        { provide: BedrockQuizProvider, useValue: createProvider('bedrock') },
        { provide: GeminiQuizProvider, useValue: createProvider('gemini') },
        { provide: OpenAiQuizProvider, useValue: createProvider('openai') },
        { provide: MockQuizProvider, useValue: createProvider('mock') },
        {
          provide: AnthropicQuizProvider,
          useValue: createProvider('anthropic'),
        },
        { provide: GroqQuizProvider, useValue: createProvider('groq') },
      ],
    }).compile();

    service = moduleRef.get(AiService);
  });

  it('calls Bedrock Converse with the given system/user prompts and an explicit model', async () => {
    const result = await service.chat('system prompt', 'user prompt', {
      model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      maxTokens: 512,
    });

    expect(bedrockClient.converse).toHaveBeenCalledWith({
      modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      system: 'system prompt',
      userMessage: 'user prompt',
      maxTokens: 512,
    });
    expect(result).toBe('respuesta');
  });

  it('falls back to BEDROCK_MODEL_PRO when no model is given', async () => {
    await service.chat('system prompt', 'user prompt');

    expect(bedrockClient.converse).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      }),
    );
  });
});
