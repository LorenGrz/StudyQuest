import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleQuizProvider } from './openai-compatible-quiz.provider';

@Injectable()
export class OpenAiQuizProvider extends OpenAiCompatibleQuizProvider {
  readonly name = 'openai' as const;

  constructor(cfg: ConfigService) {
    super(cfg);
  }

  protected getApiKeyEnv(): string {
    return 'OPENAI_API_KEY';
  }

  protected getModelEnv(): string {
    return 'OPENAI_MODEL';
  }

  protected getDefaultModel(): string {
    return 'gpt-4.1-mini';
  }

  protected getEndpoint(): string {
    return 'https://api.openai.com/v1/chat/completions';
  }
}
