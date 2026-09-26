import { ConfigService } from '@nestjs/config';
import { BedrockQuizProvider } from './bedrock-quiz.provider';
import { BedrockClientService } from '../bedrock-client.service';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: sendMock,
  })),
  ConverseCommand: jest.fn().mockImplementation((input: unknown) => ({
    input,
  })),
}));

function makeConverseResponse(text: string) {
  return { output: { message: { content: [{ text }] } } };
}

function makeCfg(overrides: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) =>
      key in overrides ? overrides[key] : defaultValue,
    ),
  };
}

const rawQuestionsJson = JSON.stringify({
  questions: [
    {
      text: 'Pregunta de prueba suficientemente larga?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: 'Explicacion educativa',
      topic: 'Tema',
      difficulty: 'easy',
    },
  ],
});

describe('BedrockQuizProvider', () => {
  let setTimeoutSpy: jest.SpyInstance;

  beforeAll(() => {
    // Retries use real backoff delays; run them immediately so the suite
    // doesn't have to wait on real timers.
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((
      fn: () => void,
    ) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);
  });

  afterAll(() => {
    setTimeoutSpy.mockRestore();
  });

  beforeEach(() => {
    sendMock.mockReset();
  });

  function buildProvider(overrides: Record<string, unknown> = {}) {
    const cfg = makeCfg(overrides) as unknown as ConfigService;
    const bedrockClient = new BedrockClientService(cfg);
    return new BedrockQuizProvider(cfg, bedrockClient);
  }

  it('parses a happy-path Converse response into RawQuestion[]', async () => {
    sendMock.mockResolvedValueOnce(makeConverseResponse(rawQuestionsJson));

    const provider = buildProvider({
      BEDROCK_MODEL: 'us.amazon.nova-2-lite-v1:0',
      BEDROCK_FALLBACK_MODELS: 'us.amazon.nova-lite-v1:0',
    });

    const result = await provider.generateQuizQuestionsFromText(
      'Texto de estudio con suficiente contenido para generar preguntas. '.repeat(
        5,
      ),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ topic: 'Tema', difficulty: 'easy' });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the next model after throttling errors exhaust the primary model', async () => {
    const throttling = Object.assign(new Error('Too many requests'), {
      name: 'ThrottlingException',
    });
    sendMock
      .mockRejectedValueOnce(throttling)
      .mockRejectedValueOnce(throttling)
      .mockRejectedValueOnce(throttling)
      .mockResolvedValueOnce(makeConverseResponse(rawQuestionsJson));

    const provider = buildProvider({
      BEDROCK_MODEL: 'us.amazon.nova-2-lite-v1:0',
      BEDROCK_FALLBACK_MODELS: 'us.amazon.nova-lite-v1:0',
    });

    const result = await provider.generateQuizQuestionsFromText(
      'Texto de estudio con suficiente contenido para generar preguntas. '.repeat(
        5,
      ),
    );

    expect(result).toHaveLength(1);
    // 3 attempts against the primary model, then 1 against the fallback.
    expect(sendMock).toHaveBeenCalledTimes(4);
  });

  it('throws immediately on a non-transient error without retrying or falling back', async () => {
    const validationError = Object.assign(new Error('Bad input'), {
      name: 'ValidationException',
    });
    sendMock.mockRejectedValue(validationError);

    const provider = buildProvider({
      BEDROCK_MODEL: 'us.amazon.nova-2-lite-v1:0',
      BEDROCK_FALLBACK_MODELS: 'us.amazon.nova-lite-v1:0',
    });

    await expect(
      provider.generateQuizQuestionsFromText(
        'Texto de estudio con suficiente contenido para generar preguntas. '.repeat(
          5,
        ),
      ),
    ).rejects.toThrow();

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
