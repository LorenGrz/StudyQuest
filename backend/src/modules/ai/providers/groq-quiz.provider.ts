import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleQuizProvider } from './openai-compatible-quiz.provider';

@Injectable()
export class GroqQuizProvider extends OpenAiCompatibleQuizProvider {
  readonly name = 'groq' as const;

  constructor(cfg: ConfigService) {
    super(cfg);
  }

  protected getApiKeyEnv(): string {
    return 'GROQ_API_KEY';
  }

  protected getModelEnv(): string {
    return 'GROQ_MODEL';
  }

  protected getDefaultModel(): string {
    return 'llama-3.3-70b-versatile';
  }

  protected getEndpoint(): string {
    return 'https://api.groq.com/openai/v1/chat/completions';
  }
}
